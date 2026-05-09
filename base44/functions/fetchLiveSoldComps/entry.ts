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

    const searchParts = [
      player_name,
      card_year || '',
      card_set || '',
      variation || '',
      serial_number ? `/${serial_number}` : '',
      grade || '',
    ].map(s => String(s).trim()).filter(Boolean);

    const ebaySearchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchParts.join(' '))}&LH_Sold=1&LH_Complete=1&_sop=13&_ipg=60`;

    const cardDescription = searchParts.join(' ');

    const cardIdentity = {
      player_name,
      card_year: card_year || null,
      card_set: card_set || null,
      variation: variation || null,
      serial_number: serial_number || null,
      grade: grade || null,
      has_autograph: has_autograph ?? null,
    };

    // ── Scrape eBay in parallel with nothing (just kick it off fast) ──────────
    let html = '';
    try {
      const res = await fetch(ebaySearchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const text = await res.text();
        if (text.length > 1000 && !text.includes('Access Denied') && !text.includes('robot check')) {
          html = text.substring(0, 30000); // trimmed — enough for listings, faster LLM
        }
      }
    } catch (_) {}

    // ── SINGLE LLM CALL: extract + validate in one shot ──────────────────────
    const combinedPrompt = html
      ? `You are a sports card sold listing expert. From the eBay HTML below, extract ALL sold listings and IMMEDIATELY validate each one against the target card.

TARGET CARD: ${JSON.stringify(cardIdentity)}

For each listing:
1. Extract: title, sold_price (USD number, not shipping), sold_date (YYYY-MM-DD), item_url (https://www.ebay.com/itm/ITEMID)
2. Validate: is it an EXACT match?

DISQUALIFY if ANY mismatch: different player, year, set, grade, grading company, parallel/variation, serial number, autograph status, patch/relic status, lot/bundle, reprint.
When in doubt → EXCLUDE. Return only confident exact matches with match_confidence >= 70.

Return up to 10 validated exact matches, sorted by sold_date descending (most recent first).

HTML:
${html}`
      : `Find recent eBay sold listings for: "${cardDescription}". Return exact matches only with prices, dates, and eBay URLs.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: combinedPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          validated_items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                sold_price: { type: 'number' },
                sold_date: { type: ['string', 'null'] },
                item_url: { type: 'string' },
                match_confidence: { type: 'number' },
              }
            }
          }
        }
      },
      model: 'gemini_3_flash',
      add_context_from_internet: !html,
    });

    const validatedItems = (result?.validated_items || [])
      .filter(i => i.sold_price > 0 && i.match_confidence >= 70)
      .sort((a, b) => {
        if (!a.sold_date) return 1;
        if (!b.sold_date) return -1;
        return new Date(b.sold_date) - new Date(a.sold_date);
      });

    // If scrape+single-pass got nothing, try internet search fallback
    if (validatedItems.length === 0) {
      return await llmWebSearchFallback(cardData, cardDescription, ebaySearchUrl, base44);
    }

    const best = validatedItems[0];
    const soldPrice = best.sold_price;
    const soldDate = formatDate(best.sold_date);

    let recencyWarning = null;
    if (soldDate) {
      const saleAge = (Date.now() - new Date(soldDate).getTime()) / (1000 * 60 * 60 * 24);
      if (saleAge > 365) {
        recencyWarning = `Most recent exact match is ${Math.round(saleAge / 30)} months old — no newer sale found.`;
      }
    }

    let anomaly_flag = false;
    let anomaly_reason = null;
    if (validatedItems.length >= 3) {
      const prices = validatedItems.slice(0, 10).map(i => i.sold_price).sort((a, b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];
      if (soldPrice > median * 10) {
        anomaly_flag = true;
        anomaly_reason = `Sale price $${soldPrice} is more than 10× the median ($${median}) — possible outlier.`;
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
      match_confidence: best.match_confidence,
      confidence: best.match_confidence >= 90 ? 'high' : best.match_confidence >= 70 ? 'medium' : 'low',
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
      _scraped_count: validatedItems.length,
      _validated_count: validatedItems.length,
      _ebay_search_url: ebaySearchUrl,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function llmWebSearchFallback(cardData, cardDescription, ebaySearchUrl, base44) {
  const { grade, has_autograph, serial_number } = cardData;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Find the most recent real sold price for this exact sports card on eBay or auction houses.

CARD: ${cardDescription}

RULES:
- EXACT match only: same player, year, set, grade, variation, serial if applicable
- Grade: ${grade ? `MUST be ${grade} exactly` : 'ungraded/raw only'}
- Auto: ${has_autograph === false ? 'BASE CARD — NO autograph' : 'match autograph status'}
- Serial: ${serial_number ? `MUST be /${serial_number}` : 'no serial'}
- Only completed/sold prices — NOT asking prices
- If no exact match in last 12 months, return null
- NEVER fabricate a price`,
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
    model: 'gemini_3_flash',
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

  return Response.json({
    ...result,
    last_sold_source: result.source || 'eBay',
    anomaly_flag: false,
    anomaly_reason: null,
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