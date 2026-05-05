import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function parseUrlHints(url) {
  try {
    const u = new URL(url);
    const skw   = u.searchParams.get('_skw') || '';
    const epid  = u.searchParams.get('epid') || '';
    const hash  = u.hash || '';
    const itemMatch = url.match(/(?:\/itm\/|itemId=|item=)(\d{10,13})/i);
    const itemId = itemMatch ? itemMatch[1] : null;
    return { itemId, skw: skw.replace(/\+/g, ' '), epid, hash };
  } catch (_) {
    return { itemId: null, skw: '', epid: '', hash: '' };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await req.json();
    if (!url) return Response.json({ error: 'URL is required' }, { status: 400 });

    const { itemId, skw, epid } = parseUrlHints(url);

    // Build rich search context from what's in the URL itself
    const searchHints = [
      itemId ? `eBay item number ${itemId}` : null,
      skw    ? `search keywords: "${skw}"` : null,
      epid   ? `eBay product ID (epid): ${epid}` : null,
    ].filter(Boolean).join(', ');

    const prompt = `You are a sports card data extraction engine. OUTPUT ONLY JSON — no markdown, no commentary.

EBAY LISTING URL: ${url}
${searchHints ? `URL HINTS: ${searchHints}` : ''}

STEP 1 — FIND THE CARD:
Use web search NOW to identify this exact listing. Try ALL of these searches:
${itemId ? `- Search: "ebay.com/itm/${itemId}" OR "ebay ${itemId} card"` : ''}
${skw ? `- Search eBay for: "${skw}" — these are the listing's search keywords` : ''}
${epid ? `- Search: "ebay epid ${epid}" to find the product` : ''}
- Also try: 130point.com, cardladder.com, psacard.com, beckett.com for the same card
- The URL search keywords hint: "${skw}" — parse player name and card details from these words

STEP 2 — EXTRACT CARD DETAILS from the listing title you find:
- player_name: Full player name. "wemby" = "Victor Wembanyama". NEVER invent. Only use what you find.
- card_year: 4-digit year (e.g. 2023). null if not found.
- card_set: Brand/product (Prizm, National Treasures, Optic, Topps Chrome, etc.). null if not found.
- card_number: Card # in the set (from "#136" → "136"). null if absent.
- variation: Parallel color (Silver, Gold, Purple, Hyper, etc.). NOT the grade. null if base.
- serial_number: From "/25", "/10", "/99" → return just the number ("25"). null if not serialized.
- grade: Exact grading (PSA 10, BGS 9.5, SGC 10, Raw, Ungraded). null if not stated.
- image_url: The eBay image URL (i.ebayimg.com/...) for this listing. null if not found.

STEP 3 — GET PRICES:
- cheapest_available: The BUY IT NOW price or current bid on this ACTIVE listing.
- comp_value: The HAMMER PRICE from a COMPLETED/SOLD listing for the exact same card. 
  Search: "[player] [year] [set] [variation] [grade] sold ebay completed"
  Also check 130point.com and cardladder.com for recent sales.
  MUST be different from cheapest_available. null if no real sold comp found.

STEP 4 — ADDITIONAL SIGNALS:
- is_rookie_year: true if this is the player's official rookie year card.
- has_autograph: true if "Auto" or "Autograph" in the title.
- has_patch: true if "Patch", "RPA", or memorabilia mentioned.
- color_matches_team: true if parallel color matches player's team colors.
- player_popularity: "rising" | "peak" | "legend" | "declining" based on current market.

CRITICAL RULES:
- If you cannot find the card AT ALL after searching, return player_name as null.
- NEVER invent or hallucinate data. Only return what you actually find via search.
- comp_value (past sale) and cheapest_available (current ask) are ALWAYS different numbers.

Return ONLY this JSON:
{
  "player_name": "Victor Wembanyama",
  "card_year": "2023",
  "card_set": "Prizm",
  "card_number": "136",
  "variation": "Silver",
  "serial_number": null,
  "grade": null,
  "comp_value": 250,
  "cheapest_available": 299,
  "image_url": "https://i.ebayimg.com/...",
  "is_rookie_year": true,
  "color_matches_team": false,
  "has_autograph": false,
  "has_patch": false,
  "player_popularity": "peak"
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          player_name:        { type: "string" },
          card_year:          { type: "string" },
          card_set:           { type: "string" },
          card_number:        { type: "string" },
          variation:          { type: "string" },
          serial_number:      { type: "string" },
          grade:              { type: "string" },
          comp_value:         { type: "number" },
          cheapest_available: { type: "number" },
          image_url:          { type: "string" },
          is_rookie_year:     { type: "boolean" },
          color_matches_team: { type: "boolean" },
          has_autograph:      { type: "boolean" },
          has_patch:          { type: "boolean" },
          player_popularity:  { type: "string" },
        }
      },
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
    });

    // Clean up LLM "null"/"unknown" strings
    const BAD = new Set(['null', 'unknown', 'undefined', 'n/a', 'none', '']);
    for (const key of ['player_name', 'card_year', 'card_set', 'card_number', 'variation', 'serial_number', 'grade', 'image_url']) {
      if (!result[key] || BAD.has(String(result[key]).toLowerCase().trim())) {
        result[key] = null;
      }
    }
    for (const key of ['comp_value', 'cheapest_available']) {
      const v = parseFloat(result[key]);
      result[key] = (!v || isNaN(v) || v <= 0) ? null : v;
    }

    if (!result.player_name) {
      return Response.json({
        error: 'Could not identify the card from this listing. It may have ended or been removed. Please enter details manually.'
      }, { status: 422 });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});