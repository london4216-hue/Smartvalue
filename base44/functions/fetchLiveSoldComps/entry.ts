import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const cardData = await req.json();
    const {
      player_name, card_year, card_set, variation, serial_number,
      grade, has_autograph,
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

    const compSchema = {
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
    };

    const todayStr = new Date().toISOString().split('T')[0];

    // ── Step 1: Try Apify scraper (if token available) ───────────────────────
    let html = '';
    const apifyToken = Deno.env.get('APIFY_TOKEN') || '';
    if (apifyToken.length > 0) {
      try {
        const apifyRes = await fetch('https://api.apify.com/v2/actor-tasks/heropuppeteer~ebay-sold-listings-scraper/run-sync?token=' + apifyToken, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords: searchParts.join(' '), maxResults: 60, includeActiveListings: false, includeSoldListings: true }),
          signal: AbortSignal.timeout(8000),
        });
        if (apifyRes.ok) {
          const data = await apifyRes.json();
          if (data.output?.results?.length > 0) html = JSON.stringify(data.output.results);
        }
      } catch (_) {}
    }

    let primaryItems = [];

    // ── Step 2: Parse Apify HTML with LLM if we got data ─────────────────────
    if (html) {
      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Sports card sold listing expert. From this eBay data, extract validated sold listings for:
TARGET: ${JSON.stringify(cardIdentity)}
RULES: Extract title, sold_price (USD), sold_date (YYYY-MM-DD), item_url. DISQUALIFY: different player, year, set, grade, grading company, parallel, serial, auto status, lots/bundles.
Return only confident exact matches (match_confidence >= 70), sorted by sold_date descending. Max 8 results. TODAY: ${todayStr}
DATA: ${html}`,
        response_json_schema: compSchema,
        model: 'gemini_3_flash',
        add_context_from_internet: false,
      });
      primaryItems = (res?.validated_items || []).filter(i => i.sold_price > 0 && i.match_confidence >= 70);
    }

    // ── Step 3: Internet search (primary path when no Apify) ─────────────────
    if (primaryItems.length === 0) {
      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a sports card market expert. Search eBay completed/sold listings and find REAL recent sales for this exact card.

CARD: ${cardDescription}
Grade: ${grade || 'any'} | Auto: ${has_autograph === false ? 'NO' : has_autograph ? 'YES' : 'unknown'} | Serial: ${serial_number ? `/${serial_number}` : 'none'}

CRITICAL RULES:
- Return ONLY actual completed eBay sales (not active listings, not asking prices)
- Match EXACT grade, grading company, parallel/variation, serial number
- Do NOT fabricate prices — if unsure, leave empty
- Include the eBay item URL if found
- Return up to 5 most recent sales sorted newest first
TODAY: ${todayStr}`,
        response_json_schema: compSchema,
        model: 'gemini_3_1_pro',
        add_context_from_internet: true,
      });
      primaryItems = (res?.validated_items || []).filter(i => i.sold_price > 0 && i.match_confidence >= 60);
    }

    if (primaryItems.length === 0) {
      return Response.json({
        comp_value: null,
        sale_date: null,
        match_confidence: 0,
        confidence: 'low',
        tier: 'no_comp_conservative_estimate',
        notes: 'No exact match found.',
        _ebay_search_url: ebaySearchUrl,
      });
    }

    // Sort by recency
    const sorted = primaryItems.sort((a, b) => {
      if (!a.sold_date) return 1;
      if (!b.sold_date) return -1;
      return new Date(b.sold_date) - new Date(a.sold_date);
    });

    const best = sorted[0];
    const soldPrice = best.sold_price;
    const soldDate = formatDate(best.sold_date);

    // Anomaly check
    let anomaly_flag = false;
    let anomaly_reason = null;
    if (sorted.length >= 3) {
      const prices = sorted.map(i => i.sold_price).sort((a, b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];
      if (soldPrice > median * 10) {
        anomaly_flag = true;
        anomaly_reason = `Sale $${soldPrice} is >10× median ($${median}) — possible outlier.`;
      } else if (soldPrice < median * 0.1) {
        anomaly_flag = true;
        anomaly_reason = `Sale $${soldPrice} is <0.1× median ($${median}) — possible outlier.`;
      }
    }

    return Response.json({
      comp_value: soldPrice,
      sale_date: soldDate,
      last_sold_source: 'eBay',
      last_sold_url: best.item_url || null,
      match_confidence: best.match_confidence,
      confidence: best.match_confidence >= 85 ? 'high' : best.match_confidence >= 65 ? 'medium' : 'low',
      tier: 'exact_match',
      notes: `Validated from ${sorted.length} listing(s).`,
      anomaly_flag,
      anomaly_reason,
      similar_comps: sorted.slice(1, 6).map(i => ({
        title: i.title,
        sold_price: i.sold_price,
        sold_date: formatDate(i.sold_date),
        item_url: i.item_url || null,
      })),
      _ebay_search_url: ebaySearchUrl,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function formatDate(raw) {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toISOString().split('T')[0];
  } catch (_) { return raw; }
}