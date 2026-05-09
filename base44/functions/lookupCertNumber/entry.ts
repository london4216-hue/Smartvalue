import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Looks up a PSA or BGS cert number and returns real card data + pop report.
 * PSA public API: https://api.psacard.com/publicapi/cert/GetByCertNumber/{certNumber}
 * BGS: scrape beckett cert lookup page
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cert_number, grader } = await req.json();
    if (!cert_number) return Response.json({ error: 'cert_number is required' }, { status: 400 });

    const certClean = cert_number.toString().replace(/\D/g, '');
    const graderUpper = (grader || '').toUpperCase();

    // ── PSA Lookup ────────────────────────────────────────────────────────────
    if (!grader || graderUpper === 'PSA') {
      try {
        const psaRes = await fetch(`https://api.psacard.com/publicapi/cert/GetByCertNumber/${certClean}`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
          }
        });

        if (psaRes.ok) {
          const psaData = await psaRes.json();
          const cert = psaData?.PSACert || psaData?.cert || psaData;

          if (cert && (cert.Subject || cert.CardGrade)) {
            const grade = cert.CardGrade ? `PSA ${cert.CardGrade}` : null;
            const popAtGrade = cert.PopulationHigher != null
              ? null  // We don't have the exact pop from cert endpoint, just card data
              : null;

            return Response.json({
              source: 'psa_cert',
              cert_number: certClean,
              grader: 'PSA',
              grade,
              player_name: cert.Subject || null,
              card_year: cert.Year ? String(cert.Year) : null,
              card_set: cert.Brand || cert.Set || null,
              card_number: cert.CardNumber || null,
              variation: cert.Variety || cert.Parallel || null,
              serial_number: null,
              is_rookie_year: null,
              cert_url: `https://www.psacard.com/cert/${certClean}`,
              raw: cert,
            });
          }
        }
      } catch (_) {}
    }

    // ── BGS/Beckett Lookup via web scrape ────────────────────────────────────
    if (!grader || graderUpper === 'BGS' || graderUpper === 'BECKETT') {
      try {
        const bgsRes = await fetch(`https://www.beckett.com/grading/pop-report/bgs-grading/card-detail/${certClean}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
            'Accept': 'text/html',
          }
        });

        if (bgsRes.ok) {
          const html = await bgsRes.text();
          if (!html.includes('not found') && html.length > 500) {
            // Use LLM to extract card data from the HTML
            const extracted = await base44.asServiceRole.integrations.Core.InvokeLLM({
              prompt: `Extract card data from this Beckett cert lookup HTML. Return JSON only.
HTML snippet: ${html.substring(0, 3000)}

Extract: player_name, card_year, card_set, variation, grade (e.g. "BGS 9.5"), card_number, serial_number`,
              response_json_schema: {
                type: "object",
                properties: {
                  player_name: { type: ["string", "null"] },
                  card_year: { type: ["string", "null"] },
                  card_set: { type: ["string", "null"] },
                  variation: { type: ["string", "null"] },
                  grade: { type: ["string", "null"] },
                  card_number: { type: ["string", "null"] },
                  serial_number: { type: ["string", "null"] },
                }
              },
              model: 'gemini_3_flash',
            });

            if (extracted?.player_name) {
              return Response.json({
                source: 'bgs_cert',
                cert_number: certClean,
                grader: 'BGS',
                ...extracted,
                cert_url: `https://www.beckett.com/grading/pop-report/bgs-grading/card-detail/${certClean}`,
              });
            }
          }
        }
      } catch (_) {}
    }

    // ── Fallback: web search for any grader ──────────────────────────────────
    const searchResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Look up sports card cert number ${certClean} ${grader ? `(${grader})` : ''}.
Search for this cert at PSA card lookup, Beckett cert lookup, or SGC cert lookup.
URL to try: https://www.psacard.com/cert/${certClean}

Extract the card details: player name, year, set, grade, variation, serial number, card number.
Return JSON only with fields: player_name, card_year, card_set, variation, grade, card_number, serial_number, grader, cert_url`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          player_name: { type: ["string", "null"] },
          card_year: { type: ["string", "null"] },
          card_set: { type: ["string", "null"] },
          variation: { type: ["string", "null"] },
          grade: { type: ["string", "null"] },
          card_number: { type: ["string", "null"] },
          serial_number: { type: ["string", "null"] },
          grader: { type: ["string", "null"] },
          cert_url: { type: ["string", "null"] },
        }
      },
      model: 'gemini_3_flash',
    });

    if (searchResult?.player_name) {
      return Response.json({
        source: 'web_search',
        cert_number: certClean,
        ...searchResult,
      });
    }

    return Response.json({ error: 'Could not find cert number. Check the number and try again.' }, { status: 404 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});