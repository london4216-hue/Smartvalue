import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { player_name, card_year, card_set, grade, cert_number } = await req.json();

    if (!player_name || !grade) {
      return Response.json({
        error: 'Missing required fields: player_name, grade'
      }, { status: 400 });
    }

    const gradeCompany = grade.toUpperCase().startsWith('BGS') ? 'BGS' : grade.toUpperCase().startsWith('SGC') ? 'SGC' : 'PSA';

    // If we have a cert number, try direct PSA cert lookup — returns pop_at_grade + pop_higher directly
    if (cert_number && gradeCompany === 'PSA') {
      try {
        const certClean = cert_number.toString().replace(/\D/g, '');
        // PSA public cert lookup — returns PopulationAtGrade and PopulationHigher
        const psaRes = await fetch(`https://www.psacard.com/cert/${certClean}`, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }
        });
        if (psaRes.ok) {
          const html = await psaRes.text();
          // Extract pop data from PSA cert page HTML
          const popAtMatch = html.match(/Population[^<]*<[^>]+>(\d+)/i) || html.match(/"population"\s*:\s*(\d+)/i);
          const popHigherMatch = html.match(/Pop\s+Higher[^<]*<[^>]+>(\d+)/i) || html.match(/"popHigher"\s*:\s*(\d+)/i);
          
          if (popAtMatch || popHigherMatch) {
            const popAtGrade = popAtMatch ? parseInt(popAtMatch[1]) : null;
            const popHigher = popHigherMatch ? parseInt(popHigherMatch[1]) : null;
            const isHighestGraded = popHigher === 0;
            const totalPop = popAtGrade !== null ? popAtGrade + (popHigher || 0) : null;
            
            if (popAtGrade !== null) {
              const scarcity = popAtGrade <= 4 ? 'ultra_rare' : popAtGrade <= 20 ? 'very_rare' : popAtGrade <= 100 ? 'rare' : popAtGrade <= 500 ? 'uncommon' : 'common';
              return Response.json({
                grade_requested: grade,
                grading_company: 'PSA',
                pop_at_grade: popAtGrade,
                pop_higher: popHigher,
                total_pop_all_grades: totalPop,
                highest_grade_achieved: isHighestGraded ? grade : null,
                scarcity_assessment: scarcity,
                source_confidence: 'high',
                notes: `Direct PSA cert lookup for #${certClean}`
              });
            }
          }
        }
      } catch (_) {}

      // Fallback: use LLM with the cert number specifically to look up PSA cert page
      try {
        const certClean = cert_number.toString().replace(/\D/g, '');
        const certResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Look up PSA cert number ${certClean} at https://www.psacard.com/cert/${certClean}
          
Return the EXACT data shown on that page:
- pop_at_grade: the "Population" number shown
- pop_higher: the "Pop Higher" number shown (0 if it shows 0, NOT null)
- Grade shown on cert
- Card title/description

If the page shows Population=1 and Pop Higher=0, that means this is the single highest graded copy.

Return JSON: pop_at_grade, pop_higher, grade_on_cert, card_description, source_confidence ("high" if found page)`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              pop_at_grade: { type: ["number", "null"] },
              pop_higher: { type: ["number", "null"] },
              grade_on_cert: { type: ["string", "null"] },
              card_description: { type: ["string", "null"] },
              source_confidence: { type: "string" }
            }
          },
          model: 'gemini_3_flash',
        });

        if (certResult?.pop_at_grade !== null && certResult?.pop_at_grade !== undefined) {
          const p = certResult.pop_at_grade;
          const ph = certResult.pop_higher;
          const scarcity = p <= 4 ? 'ultra_rare' : p <= 20 ? 'very_rare' : p <= 100 ? 'rare' : p <= 500 ? 'uncommon' : 'common';
          return Response.json({
            grade_requested: grade,
            grading_company: 'PSA',
            pop_at_grade: p,
            pop_higher: ph,
            total_pop_all_grades: p + (ph || 0),
            highest_grade_achieved: ph === 0 ? grade : null,
            scarcity_assessment: scarcity,
            source_confidence: certResult.source_confidence || 'medium',
            notes: `PSA cert #${certClean} lookup`
          });
        }
      } catch (_) {}
    }

    // Fetch PSA pop page directly and parse the table
    let popData = null;
    try {
      const popUrl = `https://www.psacard.com/pop/basketball-cards/?search=${encodeURIComponent(player_name)} ${card_year || ''} ${card_set || ''}`;
      const popRes = await fetch(popUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(8000),
      });
      
      if (popRes.ok) {
        const popHtml = await popRes.text();
        // Extract table data from PSA pop page
        if (popHtml.length > 500 && !popHtml.includes('No results')) {
          popData = popHtml.substring(0, 25000); // Send first 25KB to LLM for parsing
        }
      }
    } catch (_) {}

    // Use LLM to parse PSA pop HTML with cross-check
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a sports card data researcher verifying PSA population data. Your job is to extract EXACT numbers from official sources.

CARD TO FIND: ${player_name} | Year: ${card_year || 'unknown'} | Set: ${card_set || 'unknown'} | Looking for grade: ${grade}

${popData ? `I have the raw PSA pop page HTML. Parse it and find the table row for this exact card. Extract the grade columns:
- Count at ${grade} → pop_at_grade
- Sum of all grades HIGHER than ${grade} → pop_higher
- Total across ALL grades → total_pop_all_grades
- What is the maximum grade shown on that row? → highest_grade_achieved` : `
No HTML provided — search PSA website directly at https://www.psacard.com/pop/basketball-cards/
Search for "${player_name}" and find this exact card's row, then read all grade columns.`}

CRITICAL:
- Only return numbers you can VERIFY from PSA
- pop_higher must be the SUM of all higher grades (not just one grade)
- If no higher grades exist, pop_higher = 0
- Source must say "psacard.com/pop" or "PSA official"
- Do NOT estimate — if unsure, set source_confidence = "low"

Return JSON: pop_at_grade, pop_higher, total_pop_all_grades, highest_grade_achieved, scarcity_assessment, source_confidence (high/medium/low), source_url`,
      file_urls: popData ? [] : [],
      response_json_schema: {
        type: "object",
        properties: {
          pop_at_grade: { type: ["number", "null"] },
          pop_higher: { type: ["number", "null"] },
          total_pop_all_grades: { type: ["number", "null"] },
          highest_grade_achieved: { type: ["string", "null"] },
          scarcity_assessment: { type: "string" },
          source_confidence: { type: "string" },
          source_url: { type: ["string", "null"] },
          notes: { type: ["string", "null"] }
        }
      },
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
    });

    // If the model couldn't find real data, mark it clearly
    if (result.pop_at_grade === null || result.pop_at_grade === undefined) {
      result.source_confidence = 'low';
      result._is_estimated = true;
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});