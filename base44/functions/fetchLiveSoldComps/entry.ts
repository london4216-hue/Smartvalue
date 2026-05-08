import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const cardData = await req.json();
    const {
      player_name, card_year, card_set, variation, serial_number,
      grade, has_autograph, is_rookie_year, card_number,
    } = cardData;

    if (!player_name) return Response.json({ error: 'player_name is required' }, { status: 400 });

    // Build a precise eBay sold-listings search URL
    const searchParts = [
      player_name,
      card_year || '',
      card_set || '',
      variation || '',
      serial_number ? `/${serial_number}` : '',
      grade || '',
    ].map(s => String(s).trim()).filter(Boolean);

    const ebaySearchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchParts.join(' '))}&LH_Sold=1&LH_Complete=1&_sop=13&_ipg=60`;

    // ── STEP 1: Scrape eBay sold listings page ─────────────────────────────
    let html = '';
    try {
      const res = await fetch(ebaySearchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });
      if (res.ok) {
        const text = await res.text();
        if (text.length > 1000 && !text.includes('Access Denied') && !text.includes('robot check')) {
          html = text;
        }
      }
    } catch (_) {}

    // ── STEP 2: LLM extracts raw sold listings from HTML ───────────────────
    const cardDescription = [
      player_name, card_year, card_set, variation,
      serial_number ? `/${serial_number}` : null, grade,
    ].filter(Boolean).join(' ');

    const htmlSection = html ? html.substring(0, 55000) : '';

    const extractionPrompt = html
      ? `You are an eBay sold listings extractor. Extract ALL sold/completed listings from this HTML.

TARGET CARD: "${cardDescription}"

For each listing in the HTML extract:
- title: full listing title (exact, do not truncate)
- sold_price: the final sale price as a number in USD (NOT the current listing price, NOT shipping)
- sold_date: date the auction ended / item sold, as YYYY-MM-DD
- item_url: the full direct eBay URL https://www.ebay.com/itm/ITEMID
- item_id: numeric eBay item ID

RULES:
- Only include items with a real sold price > 0
- item_url MUST be a direct /itm/ link, not a search page
- Exclude shipping costs from price
- Extract up to 30 listings

HTML:
${htmlSection}`
      : `Search your knowledge for recent eBay sold listings for: "${cardDescription}". Return up to 10 known recent sold results.`;

    const extraction = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: extractionPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                sold_price: { type: 'number' },
                sold_date: { type: ['string', 'null'] },
                item_url: { type: 'string' },
                item_id: { type: ['string', 'null'] },
              }
            }
          }
        }
      },
      model: 'gemini_3_flash',
      add_context_from_internet: !html,
    });

    const rawItems = (extraction?.items || []).filter(i => i.sold_price > 0 && i.item_url);

    // ── STEP 3: STRICT MATCH VALIDATION ───────────────────────────────────
    // Build exact card identity for the validator
    const cardIdentity = {
      player_name,
      card_year: card_year || null,
      card_set: card_set || null,
      variation: variation || null,
      serial_number: serial_number || null,
      grade: grade || null,
      has_autograph: has_autograph ?? null,
      is_rookie_year: is_rookie_year ?? null,
      card_number: card_number || null,
    };

    if (rawItems.length === 0) {
      // No scraped data — use LLM web search as last resort
      return await llmWebSearchFallback(cardData, cardDescription, ebaySearchUrl, base44);
    }

    const validationPrompt = `You are a STRICT sports card match validator. 

USER'S EXACT CARD: ${JSON.stringify(cardIdentity)}

For each listing title below, determine if it is an EXACT match for the user's card.

MANDATORY DISQUALIFICATION — disqualify if ANY of these are true:
1. Different player name
2. Different year (e.g. 2022 vs 2023)
3. Different card set / product line (e.g. Topps Base vs Topps Chrome, Prizm vs Select)
4. Different grade (e.g. PSA 9 vs PSA 10)
5. Different grading company (e.g. PSA vs BGS vs SGC)
6. Different parallel or variation (e.g. Gold Refractor when user wants base Refractor)
7. Different serial number / print run (e.g. /25 vs /99)
8. Card has autograph but user's card doesn't (or vice versa)
9. Card has patch/relic but user's card doesn't (or vice versa)
10. Multi-card lot, bundle, or set
11. Reprint, custom, or non-official card
12. ANY ambiguity about exact match → DISQUALIFY

ACCURACY OVER QUANTITY. When in doubt, EXCLUDE.

LISTINGS:
${JSON.stringify(rawItems.map((item, i) => ({ index: i, title: item.title, price: item.sold_price, date: item.sold_date })), null, 2)}

Return validation results for each item.`;

    const validation = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: validationPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                index: { type: 'number' },
                is_exact_match: { type: 'boolean' },
                match_confidence: { type: 'number' },
                rejection_reason: { type: ['string', 'null'] },
              }
            }
          }
        }
      },
      model: 'gemini_3_flash',
    });

    const validationMap = {};
    for (const r of (validation?.results || [])) {
      validationMap[r.index] = r;
    }

    // Filter to only exact matches with confidence >= 70
    const validatedItems = rawItems
      .map((item, i) => ({ ...item, _validation: validationMap[i] || { is_exact_match: false, match_confidence: 0 } }))
      .filter(item => item._validation.is_exact_match && item._validation.match_confidence >= 70);

    if (validatedItems.length === 0) {
      // No validated matches from scrape — try web search
      return await llmWebSearchFallback(cardData, cardDescription, ebaySearchUrl, base44);
    }

    // ── STEP 4: Sort by date, pick most recent ─────────────────────────────
    validatedItems.sort((a, b) => {
      if (!a.sold_date) return 1;
      if (!b.sold_date) return -1;
      return new Date(b.sold_date) - new Date(a.sold_date);
    });

    const best = validatedItems[0];
    const soldPrice = best.sold_price;
    const soldDate = formatDate(best.sold_date);

    // ── STEP 5: 12-month recency check ────────────────────────────────────
    let recencyWarning = null;
    if (soldDate) {
      const saleAge = (Date.now() - new Date(soldDate).getTime()) / (1000 * 60 * 60 * 24);
      if (saleAge > 365) {
        recencyWarning = `Most recent exact match is ${Math.round(saleAge / 30)} months old — no newer sale found.`;
      }
    }

    // ── STEP 6: Sanity / anomaly check ────────────────────────────────────
    let anomaly_flag = false;
    let anomaly_reason = null;

    if (validatedItems.length >= 3) {
      const prices = validatedItems.slice(0, 10).map(i => i.sold_price);
      const median = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];
      if (soldPrice > median * 10) {
        anomaly_flag = true;
        anomaly_reason = `Sale price $${soldPrice} is more than 10x the median ($${median}) — possible outlier.`;
      } else if (soldPrice < median * 0.1) {
        anomaly_flag = true;
        anomaly_reason = `Sale price $${soldPrice} is less than 1/10th the median ($${median}) — possible outlier.`;
      }
    }

    return Response.json({
      comp_value: soldPrice,
      sale_date: soldDate,
      last_sold_source: 'eBay',
      last_sold_url: best.item_url || null,
      match_confidence: best._validation.match_confidence,
      confidence: best._validation.match_confidence >= 90 ? 'high' : best._validation.match_confidence >= 70 ? 'medium' : 'low',
      tier: 'exact_match',
      notes: recencyWarning || `Exact match validated from ${validatedItems.length} sold listing(s).`,
      anomaly_flag,
      anomaly_reason,
      similar_comps: validatedItems.slice(1, 6).map(i => ({
        title: i.title,
        sold_price: i.sold_price,
        sold_date: formatDate(i.sold_date),
        item_url: i.item_url,
      })),
      _scraped_count: rawItems.length,
      _validated_count: validatedItems.length,
      _ebay_search_url: ebaySearchUrl,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── LLM web search fallback when scraping yields nothing ──────────────────────
async function llmWebSearchFallback(cardData, cardDescription, ebaySearchUrl, base44) {
  const { player_name, card_year, card_set, variation, serial_number, grade, has_autograph } = cardData;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are a sports card market expert. Find the MOST RECENT real sold price for this exact card on eBay.

CARD: ${cardDescription}

STRICT RULES:
- Return ONLY a sale for this EXACT card (same player, year, set, grade, variation, serial if applicable)
- Grade rule: ${grade ? `MUST be ${grade} exactly — reject any other grade` : 'ungraded/raw only'}
- Auto rule: ${has_autograph === false ? 'BASE CARD — NO autograph. Reject any auto version.' : 'Match autograph status.'}
- Serial rule: ${serial_number ? `MUST be /${serial_number} exactly.` : 'No serial number.'}
- Do NOT return current asking price — only actual completed/sold prices
- If no exact match found in last 12 months, return null
- NEVER guess or fabricate a price

Search eBay sold listings, PWCC, Goldin, Heritage for the most recent real completed sale.`,
    response_json_schema: {
      type: 'object',
      properties: {
        comp_value: { type: ['number', 'null'] },
        sale_date: { type: ['string', 'null'] },
        confidence: { type: 'string' },
        source: { type: 'string' },
        notes: { type: 'string' },
        tier: { type: 'string' },
        last_sold_url: { type: ['string', 'null'] },
        match_confidence: { type: 'number' },
      }
    },
    add_context_from_internet: true,
    model: 'gemini_3_1_pro',
  });

  if (!result?.comp_value) {
    return Response.json({
      comp_value: null,
      sale_date: null,
      match_confidence: 0,
      confidence: 'low',
      tier: 'no_comp_conservative_estimate',
      error: 'No exact match found for this card.',
      _ebay_search_url: ebaySearchUrl,
    });
  }

  // Sanity check on web fallback result
  let anomaly_flag = false;
  let anomaly_reason = null;
  const price = result.comp_value;
  if (price > 500000) {
    anomaly_flag = true;
    anomaly_reason = 'Outlier sale detected — price exceeds $500,000 which is unusual.';
  }

  return Response.json({
    ...result,
    last_sold_source: result.source || 'eBay',
    anomaly_flag,
    anomaly_reason,
    _scraped_count: 0,
    _validated_count: 0,
    _ebay_search_url: ebaySearchUrl,
  });
}

function formatDate(raw) {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toISOString().split('T')[0];
  } catch (_) { return raw; }
}