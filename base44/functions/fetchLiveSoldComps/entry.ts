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

    // ── Scrape eBay HTML ──────────────────────────────────────────────────────
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
          html = text.substring(0, 30000);
        }
      }
    } catch (_) {}

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

    const basePrompt = html
      ? `You are a sports card sold listing expert. From the eBay HTML below, extract ALL sold listings and IMMEDIATELY validate each one against the target card.

TARGET CARD: ${JSON.stringify(cardIdentity)}

For each listing:
1. Extract: title, sold_price (USD number, not shipping), sold_date (YYYY-MM-DD), item_url (https://www.ebay.com/itm/ITEMID)
2. Validate: is it an EXACT match?

DISQUALIFY if ANY mismatch: different player, year, set, grade, grading company, parallel/variation, serial number, autograph status, patch/relic status, lot/bundle, reprint.
When in doubt → EXCLUDE. Return only confident exact matches with match_confidence >= 70.

TODAY'S DATE: ${todayStr}
Sort ALL results by sold_date descending — the item with the sold_date CLOSEST to today must be first.
Return up to 10 validated exact matches.

HTML:
${html}`
      : `Find recent eBay sold listings for: "${cardDescription}". Return exact matches only with prices, dates, and eBay URLs.`;

    // ── MULTI-MODEL PARALLEL CROSS-CHECK ─────────────────────────────────────
    // Run two different models simultaneously and reconcile results for accuracy
    const [primaryResult, crossCheckResult] = await Promise.allSettled([
      // Model 1: Gemini Flash — fast primary extraction
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: basePrompt,
        response_json_schema: compSchema,
        model: 'gemini_3_flash',
        add_context_from_internet: !html,
      }),
      // Model 2: GPT — independent web search cross-check for price validation
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a sports card market data expert. Find the most recent REAL completed sale price for this exact card.

CARD: ${cardDescription}
Grade: ${grade || 'any'}
Auto: ${has_autograph === false ? 'NO — base card only' : has_autograph ? 'YES — autograph required' : 'unknown'}
Serial: ${serial_number ? `MUST be /${serial_number}` : 'none'}

Search eBay completed listings, 130point, PWCC, Goldin, or any reliable auction source.
Return the most recent EXACT match you find with high confidence.
TODAY: ${todayStr}

RULES: Only real sold prices. No asking prices. No fabrication. If uncertain, lower the match_confidence.`,
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
                  item_url: { type: ['string', 'null'] },
                  match_confidence: { type: 'number' },
                  source: { type: 'string' },
                }
              }
            }
          }
        },
        model: 'gpt_5_mini',
        add_context_from_internet: true,
      }),
    ]);

    // ── RECONCILE RESULTS ────────────────────────────────────────────────────
    const primaryItems = primaryResult.status === 'fulfilled'
      ? (primaryResult.value?.validated_items || []).filter(i => i.sold_price > 0 && i.match_confidence >= 70)
      : [];

    const crossItems = crossCheckResult.status === 'fulfilled'
      ? (crossCheckResult.value?.validated_items || []).filter(i => i.sold_price > 0 && i.match_confidence >= 65)
      : [];

    // Merge and deduplicate by price proximity (within 15%)
    const allItems = [...primaryItems];
    for (const ci of crossItems) {
      const isDuplicate = primaryItems.some(pi =>
        Math.abs(pi.sold_price - ci.sold_price) / Math.max(pi.sold_price, 1) < 0.15
      );
      if (!isDuplicate) {
        allItems.push({ ...ci, _from_cross_check: true });
      } else {
        // Boost confidence of primary item when cross-check agrees
        const matching = allItems.find(pi =>
          Math.abs(pi.sold_price - ci.sold_price) / Math.max(pi.sold_price, 1) < 0.15
        );
        if (matching) matching.match_confidence = Math.min(99, matching.match_confidence + 8);
      }
    }

    // Sort by recency
    const validatedItems = allItems.sort((a, b) => {
      if (!a.sold_date) return 1;
      if (!b.sold_date) return -1;
      return new Date(b.sold_date) - new Date(a.sold_date);
    });

    // If nothing from either model, try internet fallback
    if (validatedItems.length === 0) {
      return await llmWebSearchFallback(cardData, cardDescription, ebaySearchUrl, base44);
    }

    const best = validatedItems[0];
    const soldPrice = best.sold_price;
    const soldDate = formatDate(best.sold_date);

    // Cross-check agreement flag
    const crossCheckAgrees = crossItems.some(ci =>
      Math.abs(ci.sold_price - soldPrice) / Math.max(soldPrice, 1) < 0.20
    );
    const crossCheckDisagrees = crossItems.length > 0 && !crossCheckAgrees;

    let recencyWarning = null;
    if (soldDate) {
      const saleAge = (Date.now() - new Date(soldDate).getTime()) / (1000 * 60 * 60 * 24);
      if (saleAge > 365) {
        recencyWarning = `Closest sale found is ${Math.round(saleAge / 30)} months ago — no more recent exact match found.`;
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

    // If models disagree significantly on price — fire a judge model to resolve it
    if (crossCheckDisagrees && crossItems.length > 0) {
      const crossPrice = crossItems[0].sold_price;
      const disagreePct = Math.abs(crossPrice - soldPrice) / Math.max(soldPrice, 1) * 100;
      if (disagreePct > 25) {
        try {
          const judgeResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are a sports card market data judge. Two AI models found different recent sold prices for the same card and you must determine which is more accurate.

CARD: ${cardDescription}
TODAY: ${new Date().toISOString().split('T')[0]}

MODEL A found: $${soldPrice} sold on ${best.sold_date || 'unknown'} — listing: "${best.title || ''}"
MODEL B found: $${crossPrice} sold on ${crossItems[0].sold_date || 'unknown'} — listing: "${crossItems[0].title || ''}"

Evaluate:
1. Which price is more likely to be a real, recent, exact-match sale for this card?
2. Are both possibly valid (different recent sales)?
3. Is either one likely an error (wrong card, wrong grade, lot, etc)?

Return your verdict.`,
            response_json_schema: {
              type: 'object',
              properties: {
                correct_price: { type: 'number' },
                correct_date: { type: ['string', 'null'] },
                reasoning: { type: 'string' },
                confidence: { type: 'number' },
              }
            },
            model: 'gemini_3_1_pro',
            add_context_from_internet: true,
          });

          if (judgeResult?.correct_price > 0) {
            // Override with judge's verdict
            const judgePrice = judgeResult.correct_price;
            const originalBestIndex = validatedItems.findIndex(i =>
              Math.abs(i.sold_price - judgePrice) / Math.max(judgePrice, 1) < 0.10
            );
            if (originalBestIndex >= 0) {
              // Move judge's pick to the front
              const [judgedBest] = validatedItems.splice(originalBestIndex, 1);
              validatedItems.unshift(judgedBest);
            } else {
              // Add judge's answer as a synthetic entry
              validatedItems.unshift({
                sold_price: judgeResult.correct_price,
                sold_date: judgeResult.correct_date || best.sold_date,
                title: `Judge-verified comp`,
                match_confidence: judgeResult.confidence || 80,
                _judge_verified: true,
              });
            }
            anomaly_flag = false;
            anomaly_reason = null;
          } else {
            anomaly_flag = true;
            anomaly_reason = `AI models returned different prices ($${soldPrice.toLocaleString()} vs $${crossPrice.toLocaleString()}). Judge could not resolve — verify manually.`;
          }
        } catch (_) {
          anomaly_flag = true;
          anomaly_reason = `AI models disagree on price ($${soldPrice.toLocaleString()} vs $${crossPrice.toLocaleString()}) — verify manually.`;
        }
      }
    }

    const confidenceBoost = crossCheckAgrees ? 8 : 0;
    const finalConfidence = Math.min(99, best.match_confidence + confidenceBoost);

    return Response.json({
      comp_value: soldPrice,
      sale_date: soldDate,
      last_sold_source: 'eBay',
      last_sold_url: best.item_url || null,
      match_confidence: finalConfidence,
      confidence: finalConfidence >= 90 ? 'high' : finalConfidence >= 70 ? 'medium' : 'low',
      tier: 'exact_match',
      notes: recencyWarning || `Validated by ${crossCheckAgrees ? '2 AI models in agreement' : '1 AI model'} from ${validatedItems.length} listing(s).`,
      anomaly_flag,
      anomaly_reason,
      _cross_check_agrees: crossCheckAgrees,
      _cross_check_items: crossItems.length,
      similar_comps: validatedItems.slice(1, 6).map(i => ({
        title: i.title,
        sold_price: i.sold_price,
        sold_date: formatDate(i.sold_date),
        item_url: i.item_url || null,
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
  const todayStr = new Date().toISOString().split('T')[0];

  // Run two models in parallel for the fallback too
  const [r1, r2] = await Promise.allSettled([
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Find the most recent real sold price for this exact sports card on eBay or auction houses.
CARD: ${cardDescription}
RULES:
- EXACT match only: same player, year, set, grade, variation, serial if applicable
- Grade: ${grade ? `MUST be ${grade} exactly` : 'ungraded/raw only'}
- Auto: ${has_autograph === false ? 'BASE CARD — NO autograph' : 'match autograph status'}
- Serial: ${serial_number ? `MUST be /${serial_number}` : 'no serial'}
- Only completed/sold prices — NOT asking prices
- If no exact match in last 12 months, return null
- NEVER fabricate a price
TODAY: ${todayStr}`,
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
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Sports card price research. What did this card last sell for?
CARD: ${cardDescription}
Find the most recent completed auction or eBay sold listing. Real data only, no estimates.
TODAY: ${todayStr}`,
      response_json_schema: {
        type: 'object',
        properties: {
          comp_value: { type: ['number', 'null'] },
          sale_date: { type: ['string', 'null'] },
          match_confidence: { type: 'number' },
          source: { type: 'string' },
          notes: { type: 'string' },
        }
      },
      add_context_from_internet: true,
      model: 'gpt_5_mini',
    }),
  ]);

  const res1 = r1.status === 'fulfilled' ? r1.value : null;
  const res2 = r2.status === 'fulfilled' ? r2.value : null;

  // Pick best result — prefer the one with higher match_confidence
  let best = null;
  if (res1?.comp_value && res2?.comp_value) {
    const priceDiff = Math.abs(res1.comp_value - res2.comp_value) / Math.max(res1.comp_value, 1);
    if (priceDiff < 0.20) {
      // Models agree — average for best accuracy
      best = {
        ...res1,
        comp_value: Math.round((res1.comp_value + res2.comp_value) / 2),
        match_confidence: Math.min(99, (res1.match_confidence || 70) + 10),
        notes: `Confirmed by 2 AI models. ${res1.notes || ''}`,
      };
    } else {
      // Models disagree — fire judge model to resolve
      let judgeVerdict = null;
      try {
        judgeVerdict = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Sports card price judge. Two AI models found different sold prices for: "${cardDescription}"

MODEL A: $${res1.comp_value} on ${res1.sale_date || 'unknown'} (source: ${res1.source || 'web'})
MODEL B: $${res2.comp_value} on ${res2.sale_date || 'unknown'} (source: ${res2.source || 'web'})

Which is the more accurate recent sale? Consider recency, source reliability, and card specifics.
If you can find the actual answer from your training data, use it.`,
          response_json_schema: {
            type: 'object',
            properties: {
              correct_price: { type: ['number', 'null'] },
              correct_date: { type: ['string', 'null'] },
              reasoning: { type: 'string' },
              confidence: { type: 'number' },
            }
          },
          model: 'gemini_3_1_pro',
          add_context_from_internet: true,
        });
      } catch (_) {}

      if (judgeVerdict?.correct_price > 0) {
        best = {
          comp_value: judgeVerdict.correct_price,
          sale_date: judgeVerdict.correct_date || res1.sale_date,
          match_confidence: Math.min(99, judgeVerdict.confidence || 75),
          notes: `Judge-verified: ${judgeVerdict.reasoning || ''}`,
          source: 'Judge (Gemini Pro)',
        };
      } else {
        best = (res1.match_confidence || 0) >= (res2.match_confidence || 0) ? res1 : res2;
        best = { ...best, notes: `${best.notes || ''} Note: AI models disagreed — using higher-confidence result.` };
      }
    }
  } else {
    best = res1?.comp_value ? res1 : res2;
  }

  if (!best?.comp_value) {
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
    ...best,
    last_sold_source: best.source || 'Web Search',
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