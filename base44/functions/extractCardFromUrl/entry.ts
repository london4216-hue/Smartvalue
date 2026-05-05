import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await req.json();
    if (!url) {
      return Response.json({ error: 'URL is required' }, { status: 400 });
    }

    // ── Step 1: Try to fetch the actual page ──────────────────────────────
    let pageContent = '';
    let fetchedOk = false;

    try {
      // Try multiple user agents — eBay sometimes serves content to Googlebot
      const pageRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
      });

      const html = await pageRes.text();

      // Check if we actually got useful content (not a login wall / captcha)
      const looksLikeRealPage = html.length > 5000 &&
        !html.includes('robot or not') &&
        !html.includes('verify you\'re not a robot') &&
        !html.includes('Sign in to continue');

      if (looksLikeRealPage) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';

        const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '';

        const metaMatch = html.match(/<meta[^>]+(?:name=["']description["']|property=["']og:title["'])[^>]+content=["']([^"']{10,})["']/i);
        const meta = metaMatch ? metaMatch[1] : '';

        // Pull out og:description which eBay populates with item specifics
        const ogDescMatch = html.match(/property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
        const ogDesc = ogDescMatch ? ogDescMatch[1] : '';

        // eBay embeds structured data in JSON-LD
        const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
        let jsonLdText = '';
        for (const block of jsonLdMatches.slice(0, 3)) {
          const inner = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
          jsonLdText += inner.substring(0, 1000) + '\n';
        }

        // Extract price patterns
        const priceMatches = html.match(/\$[\d,]+\.?\d{0,2}/g) || [];
        const prices = [...new Set(priceMatches)].slice(0, 15).join(', ');

        // Strip and grab key page text
        const stripped = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .substring(0, 6000);

        pageContent = [
          `PAGE TITLE: ${title}`,
          `H1: ${h1}`,
          `META/OG DESCRIPTION: ${meta || ogDesc}`,
          `OG DESC: ${ogDesc}`,
          `PRICES FOUND ON PAGE: ${prices}`,
          `STRUCTURED DATA (JSON-LD):\n${jsonLdText}`,
          `PAGE TEXT SNIPPET:\n${stripped}`,
        ].join('\n\n');

        fetchedOk = title.length > 10 || h1.length > 10 || ogDesc.length > 10;
      }
    } catch (_fetchErr) {
      // Will fall through to search-only mode
    }

    // ── Step 2: Extract eBay item number for search anchoring ─────────────
    const ebayItemMatch = url.match(/(?:\/itm\/|itemId=|item=)(\d{10,13})/i);
    const ebayItemId = ebayItemMatch ? ebayItemMatch[1] : null;

    // ── Step 3: Build a hyper-specific LLM prompt ─────────────────────────
    const prompt = fetchedOk
      ? `You are a sports card expert AI. Extract EXACT card details from this listing page content, then find the last sold comp price.

SOURCE URL: ${url}
${ebayItemId ? `EBAY ITEM ID: ${ebayItemId}` : ''}

=== ACTUAL PAGE CONTENT (read this carefully — this IS the listing) ===
${pageContent}
=======================================================================

EXTRACTION RULES — READ EVERY WORD OF THE PAGE CONTENT ABOVE:
1. PLAYER NAME: Read the PAGE TITLE and H1 carefully. The very first proper noun(s) are almost always the player name. Do NOT guess — use what is written.
2. YEAR: Look for a 4-digit year like 2021, 2022, 2023, 2024 in the title.
3. SET: The brand/set name (Prizm, National Treasures, Optic, Select, Mosaic, Hoops, etc.) is in the title.
4. VARIATION/PARALLEL: Color parallel name (Silver, Gold, Purple Wave, etc.) — separate from grade.
5. SERIAL NUMBER: Look for patterns like "/25", "/10", "/75", "/99", "/149", "/199", "/249" — extract just the number.
6. GRADE: Look for "PSA 10", "BGS 9.5", "SGC 10", "Raw", "Ungraded" etc.
7. ASKING PRICE: The price shown on the listing page = cheapest_available.

THEN search the web for:
- "${ebayItemId ? `eBay item ${ebayItemId}` : url}" to confirm identity
- "[player name] [year] [set] [variation] [serial] [grade] sold eBay completed"
- 130point.com and cardladder.com for real hammer prices
- comp_value = what a buyer ACTUALLY PAID in a completed transaction (NOT the asking price)

CRITICAL: comp_value and cheapest_available are DIFFERENT numbers. One is a past sale, one is a current ask.`

      : `You are a sports card expert AI. Extract card details from this listing URL using web search, then find the last sold comp price.

LISTING URL: ${url}
${ebayItemId ? `EBAY ITEM ID: ${ebayItemId} — search for this exact item number on eBay to see the listing title and details.` : ''}

STEP 1 — IDENTIFY THE CARD:
${ebayItemId
  ? `Search for eBay item number ${ebayItemId} to find the exact listing title. The title contains: player name, year, set, parallel/variation, serial (/XX), and grade.`
  : `Visit this URL or search for it: ${url} to find the listing details.`
}

STEP 2 — FIND SOLD COMPS:
Once you know the card, search:
- eBay completed listings for: "[player] [year] [set] [variation] [serial] [grade] sold"
- 130point.com — search the card
- cardladder.com — search the card
comp_value = hammer price a buyer actually paid. cheapest_available = current asking price.

STEP 3 — RETURN COMPLETE DATA.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt + `

Return ONLY this JSON:
{
  "player_name": "Full Player Name (first + last)",
  "card_year": "YYYY",
  "card_set": "Set Brand Name",
  "card_number": "card # in set",
  "variation": "parallel/variation name",
  "serial_number": "number only, no slash (null if not serialized)",
  "grade": "PSA 10 / BGS 9.5 / SGC 10 / Raw / etc",
  "comp_value": last sold $ as number or null,
  "cheapest_available": current asking $ as number or null,
  "is_rookie_year": boolean,
  "color_matches_team": boolean,
  "has_autograph": boolean,
  "has_patch": boolean,
  "player_popularity": "rising" | "peak" | "legend" | "declining"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          player_name: { type: "string" },
          card_year: { type: "string" },
          card_set: { type: "string" },
          card_number: { type: "string" },
          variation: { type: "string" },
          serial_number: { type: "string" },
          grade: { type: "string" },
          comp_value: { type: "number" },
          cheapest_available: { type: "number" },
          is_rookie_year: { type: "boolean" },
          color_matches_team: { type: "boolean" },
          has_autograph: { type: "boolean" },
          has_patch: { type: "boolean" },
          player_popularity: { type: "string" },
        }
      },
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
    });

    if (!result.player_name || result.player_name === 'Unknown') {
      return Response.json({ error: 'Could not extract card details from this URL.' }, { status: 422 });
    }

    return Response.json({ ...result, _fetched_page: fetchedOk });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});