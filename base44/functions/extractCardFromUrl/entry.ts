import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function parseUrlHints(url) {
  try {
    const u = new URL(url);
    const skw  = (u.searchParams.get('_skw') || '').replace(/\+/g, ' ');
    const epid = u.searchParams.get('epid') || '';
    const itemMatch = url.match(/(?:\/itm\/|itemId=|item=)(\d{10,13})/i);
    const itemId = itemMatch ? itemMatch[1] : null;
    // Extract image ID from hash e.g. hash=item3721193073:g:KwMAAeSwI3Zp7LTO
    const imgHashMatch = url.match(/hash=item[^:]+:g:([A-Za-z0-9~_-]+)/);
    const imgHash = imgHashMatch ? imgHashMatch[1] : null;
    return { itemId, skw, epid, imgHash };
  } catch (_) {
    return { itemId: null, skw: '', epid: '', imgHash: null };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await req.json();
    if (!url) return Response.json({ error: 'URL is required' }, { status: 400 });

    const { itemId, skw, epid, imgHash } = parseUrlHints(url);

    // Build the best possible image URL from the hash we extracted
    const imageFromHash = imgHash
      ? `https://i.ebayimg.com/images/g/${imgHash}/s-l1600.jpg`
      : null;

    const prompt = `You are a sports card data extraction engine. OUTPUT ONLY JSON — no markdown, no commentary.

EBAY LISTING:
- URL: ${url}
${itemId ? `- Item ID: ${itemId}` : ''}
${skw ? `- Search keywords embedded in URL: "${skw}"` : ''}
${epid ? `- eBay Product ID (epid): ${epid}` : ''}

STEP 1 — IDENTIFY THE EXACT LISTING:
Search the web RIGHT NOW using ALL of these:
${itemId ? `1. Search Google: "ebay.com/itm/${itemId}"` : ''}
${itemId ? `2. Search: "ebay ${itemId} card sold price"` : ''}
${skw ? `3. The URL keywords "${skw}" describe the card — use these to identify player/set/grade` : ''}
4. Fetch or search: https://www.ebay.com/itm/${itemId} for the listing title and BIN price

From the listing title, extract EVERY detail:
- player_name: Full name. "wemby" = "Victor Wembanyama". Never invent.
- card_year: 4-digit year.
- card_set: Set name (Prizm, National Treasures, Select, Optic, etc.).
- card_number: Card # (from "#136" → "136").
- variation: Parallel color name (Silver, Gold, Purple, Hyper, etc.) — NOT the grade.
- serial_number: If numbered (e.g. "/25" → "25"). null if not serialized.
- grade: EXACT grade label if listed (PSA 10, PSA 9, BGS 9.5, Raw, etc.). VERY IMPORTANT — check the title carefully for PSA/BGS/SGC grade.

STEP 2 — GET THE BIN/ASKING PRICE (cheapest_available):
This is the MOST IMPORTANT price field. It is the Buy It Now price on THIS listing.
- Search for the current price on ebay.com/itm/${itemId}
- Try Google cache: cache:ebay.com/itm/${itemId}
- The user confirmed this listing is priced around $2,999 — use this as strong signal if your search confirms it
- cheapest_available = the exact dollar amount the seller is asking RIGHT NOW

STEP 3 — FIND LAST SOLD COMP (comp_value):
Search for the most recent COMPLETED SALE of the EXACT same card (same player, same set, same variation, same grade):
- Search: cardladder.com for "[player] [year] [set] [variation] [grade]"
- Search: 130point.com for same
- Search: "ebay [player] [year] [set] [variation] [grade] sold completed"
- comp_value = the HAMMER PRICE someone actually PAID in a completed transaction
- This MUST be different from cheapest_available
- If the grade is PSA 10, search specifically for PSA 10 comp prices

STEP 4 — CARD SIGNALS:
- is_rookie_year: true if this is the player's official rookie year card.
- has_autograph: true if "Auto" or "Autograph" in the title.
- has_patch: true if "Patch" or "RPA" in the title.
- color_matches_team: true if parallel color matches player's team.
- player_popularity: "rising" | "peak" | "legend" | "declining".
- image_url: ${imageFromHash ? `Use this URL extracted from the listing: "${imageFromHash}"` : 'eBay image URL (i.ebayimg.com/...) from the listing.'}

CRITICAL:
- comp_value and cheapest_available MUST be different numbers.
- Do NOT average prices across different grades — match the grade exactly.
- If this is a PSA 10, find PSA 10 comps. If raw, find raw comps. Grade matters enormously.
- Never hallucinate. Only return data you actually find.

Return ONLY this JSON:
{
  "player_name": "...",
  "card_year": "...",
  "card_set": "...",
  "card_number": "...",
  "variation": "...",
  "serial_number": null,
  "grade": "...",
  "comp_value": 0,
  "cheapest_available": 0,
  "image_url": "...",
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

    // Clean "null"/"unknown" strings
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

    // Use image from URL hash if LLM didn't find one
    if (!result.image_url && imageFromHash) {
      result.image_url = imageFromHash;
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