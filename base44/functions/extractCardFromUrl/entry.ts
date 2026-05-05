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

    // ── Attempt to fetch the eBay page to extract title + price ─────────────
    let fetchedTitle = null;
    let fetchedPrice = null;
    let fetchedImage = null;
    if (itemId) {
      // Try multiple fetch strategies to get past eBay's bot detection
      const fetchStrategies = [
        // Strategy 1: Mobile user agent (often less restricted)
        () => fetch(`https://www.ebay.com/itm/${itemId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        }),
        // Strategy 2: Desktop Chrome
        () => fetch(`https://www.ebay.com/itm/${itemId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          }
        }),
        // Strategy 3: eBay mobile site
        () => fetch(`https://m.ebay.com/itm/${itemId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
            'Accept': 'text/html',
          }
        }),
      ];

      for (const strategy of fetchStrategies) {
        if (fetchedTitle) break;
        try {
          const fetchRes = await strategy();
          const html = await fetchRes.text();
          const isBlocked = html.includes('Access Denied') || html.includes('Robot Check') || html.includes('g-recaptcha') || html.length < 2000;
          if (isBlocked) continue;

          const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"'<]+)["']/i)
            || html.match(/<title>([^<]+)<\/title>/i);
          if (ogTitleMatch) {
            const t = ogTitleMatch[1].replace(/ \| eBay.*$/i, '').trim();
            if (t && t.length > 5 && !t.toLowerCase().includes('access denied')) fetchedTitle = t;
          }

          const priceMatch = html.match(/itemprop="price"[^>]+content="([0-9,.]+)"/i)
            || html.match(/"convertedCurrentPrice"\s*:\s*\{"value":"([0-9,.]+)"/)
            || html.match(/"binPrice"\s*:\s*"US \$([0-9,]+(?:\.[0-9]+)?)"/)
            || html.match(/"price"\s*[":]\s*"?\$?\s*([0-9,]+(?:\.[0-9]{2})?)"/);
          if (priceMatch) fetchedPrice = parseFloat(priceMatch[1].replace(/,/g, ''));

          const imgMatch = html.match(/https:\/\/i\.ebayimg\.com\/images\/g\/[^"'\s\\]+\/s-l[0-9]+\.(jpg|webp)/i);
          if (imgMatch) fetchedImage = imgMatch[0];
        } catch (_) {
          // Try next strategy
        }
      }
    }

    const prompt = `You are a sports card data extraction engine. OUTPUT ONLY JSON — no markdown, no commentary.

EBAY LISTING:
- URL: ${url}
${itemId ? `- Item ID: ${itemId}` : ''}
${skw ? `- Search keywords embedded in URL: "${skw}"` : ''}
${epid ? `- eBay Product ID (epid): ${epid}` : ''}
${fetchedTitle ? `- ✅ ACTUAL LISTING TITLE (scraped directly): "${fetchedTitle}"` : ''}
${fetchedPrice ? `- ✅ ACTUAL LISTING PRICE (scraped directly): $${fetchedPrice}` : ''}
${fetchedImage ? `- ✅ ACTUAL LISTING IMAGE: ${fetchedImage}` : ''}

STEP 1 — IDENTIFY THE EXACT LISTING:
${fetchedTitle
  ? `The listing title was scraped directly: "${fetchedTitle}". Use this as the PRIMARY source of truth for all card details.`
  : itemId
    ? `eBay blocked direct page access. You MUST find the listing by searching the web RIGHT NOW:
  • Search: "${itemId} ebay"
  • Search: "ebay.com/itm/${itemId}"
  • Search: "ebay item ${itemId} basketball card"
  • Search: "${itemId} sports card PSA graded"
  The eBay listing title appears in Google search results and Google cache. Find it and extract the exact card details from it.
  ⚠️ DO NOT invent or hallucinate any card details. If you truly cannot find the listing, return all fields as null.`
    : `Parse what you can from the URL and keywords.`
}
${skw ? `- URL keywords for additional context: "${skw}"` : ''}

From the listing title, extract:
- player_name: Full player name. "wemby" = "Victor Wembanyama". ONLY from actual title found.
- card_year: 4-digit year.
- card_set: Set name (Prizm, National Treasures, Select, Optic, etc.).
- card_number: Card # (from "#136" → "136").
- variation: Parallel color name (Silver, Gold, Purple, Hyper, etc.) — NOT the grade.
- serial_number: If numbered (e.g. "/25" → "25"). null if not serialized.
- grade: EXACT grade label if listed (PSA 10, PSA 9, BGS 9.5, Raw, etc.). Check title carefully for PSA/BGS/SGC.

STEP 2 — GET THE BIN/ASKING PRICE (cheapest_available):
${fetchedPrice
  ? `✅ The BIN price was scraped directly from the listing: $${fetchedPrice}. Use this as cheapest_available.`
  : `Search Google for the current asking price on ebay.com/itm/${itemId}. cheapest_available = the exact dollar amount the seller is asking RIGHT NOW.`
}

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

    // Use scraped/hash image if LLM didn't find one
    if (!result.image_url && fetchedImage) {
      result.image_url = fetchedImage;
    } else if (!result.image_url && imageFromHash) {
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