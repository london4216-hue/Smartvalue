import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── TIME DECAY ───────────────────────────────────────────────────────────────
function timeDecayWeight(dateStr) {
  if (!dateStr) return 0.3;
  const ageDays = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 30)  return 1.00;
  if (ageDays <= 90)  return 0.90;
  if (ageDays <= 180) return 0.75;
  if (ageDays <= 365) return 0.55;
  if (ageDays <= 540) return 0.35;
  return 0.20;
}

// ─── GRADE MULTIPLIERS ────────────────────────────────────────────────────────
const GRADE_MULTS = {
  PSA: { 10: 1.00, 9: 0.50, 8: 0.28, 7: 0.18, 6: 0.12, 5: 0.08 },
  BGS: { 10: 1.25, 9.5: 0.95, 9: 0.50, 8.5: 0.32, 8: 0.22 },
  SGC: { 10: 0.85, 9: 0.48, 8: 0.28 },
};

function gradeMultiplier(company, grade) {
  const g = parseFloat(grade);
  if (!g || !company) return 1.0;
  return GRADE_MULTS[company]?.[g] ?? 0.15;
}

// ─── PARALLEL TIERS ───────────────────────────────────────────────────────────
const PARALLEL_TIERS = [
  [['superfractor', '1/1', 'gold vinyl'], 8.0],
  [['gold refractor', 'gold'], 2.5],
  [['black refractor', 'black'], 2.2],
  [['red refractor', 'red'], 1.8],
  [['orange'], 1.6],
  [['pink'], 1.5],
  [['silver prizm', 'silver'], 1.4],
  [['blue refractor', 'blue'], 1.3],
  [['cracked ice', 'purple'], 1.25],
  [['holo'], 1.2],
  [['base', ''], 1.0],
];

function parallelMultiplier(parallel) {
  if (!parallel) return 1.0;
  const key = parallel.toLowerCase().trim();
  for (const [keywords, mult] of PARALLEL_TIERS) {
    if (keywords.some(k => k && key.includes(k))) return mult;
  }
  return 1.0;
}

// ─── SERIAL SCARCITY ─────────────────────────────────────────────────────────
function serialScarcityMult(serial) {
  if (!serial) return 1.0;
  const n = parseInt(serial);
  if (n === 1)  return 5.0;
  if (n <= 5)   return 3.5;
  if (n <= 10)  return 2.5;
  if (n <= 25)  return 1.8;
  if (n <= 49)  return 1.5;
  if (n <= 75)  return 1.3;
  if (n <= 99)  return 1.2;
  if (n <= 149) return 1.1;
  if (n <= 249) return 1.05;
  return 1.0;
}

// ─── WEIGHTED MEDIAN ─────────────────────────────────────────────────────────
function weightedMedian(items) {
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => a.price - b.price);
  const totalWeight = sorted.reduce((s, i) => s + (i._w || 1), 0);
  let cum = 0;
  for (const item of sorted) {
    cum += (item._w || 1);
    if (cum >= totalWeight / 2) return item.price;
  }
  return sorted[Math.floor(sorted.length / 2)].price;
}

// ─── NORMALIZE GRADE STRING ───────────────────────────────────────────────────
function normalizeGrade(gradeStr) {
  if (!gradeStr) return { company: 'RAW', grade: null };
  const u = gradeStr.toUpperCase().trim();
  const psa = u.match(/PSA\s*(\d+(?:\.\d+)?)/);
  if (psa) return { company: 'PSA', grade: parseFloat(psa[1]) };
  const bgs = u.match(/BGS\s*(\d+(?:\.\d+)?)/);
  if (bgs) return { company: 'BGS', grade: parseFloat(bgs[1]) };
  const sgc = u.match(/SGC\s*(\d+(?:\.\d+)?)/);
  if (sgc) return { company: 'SGC', grade: parseFloat(sgc[1]) };
  return { company: 'RAW', grade: null };
}

// ─── FETCH EBAY SOLD LISTINGS VIA APIFY (race both tokens in parallel) ───────
async function fetchEbayViaApify(keywords, maxResults = 20) {
  const tokens = [Deno.env.get('APIFY_TOKEN'), Deno.env.get('ebay')].filter(t => t && t.startsWith('apify_'));
  if (tokens.length === 0) return [];

  const callApify = (token) => fetch(
    `https://api.apify.com/v2/acts/caffein.dev~ebay-sold-listings/run-sync-get-dataset-items?token=${token}&timeout=55&memory=512`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: [keywords], count: maxResults, daysToScrape: 90, sortOrder: 'endedRecently' }),
      signal: AbortSignal.timeout(58000),
    }
  ).then(async r => {
    if (!r.ok) throw new Error(`status ${r.status}`);
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('empty');
    return data.map(r => ({
      title:      r.title || '',
      sold_price: parseFloat(r.soldPrice) || 0,
      sold_date:  r.endedAt ? r.endedAt.split('T')[0] : null,
      item_url:   r.url || null,
    })).filter(i => i.sold_price > 0);
  });

  // Race all tokens — first successful response wins
  try {
    return await Promise.any(tokens.map(t => callApify(t)));
  } catch (_) {
    return [];
  }
}

// ─── LLM VALIDATOR — filter/score results from eBay API ──────────────────────
async function validateWithLLM(items, targetDesc, base44Client, minConfidence = 70) {
  if (!items.length) return [];
  const todayStr = new Date().toISOString().split('T')[0];
  try {
    const res = await base44Client.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a sports card sold-listing expert. From this list of eBay sold listings, extract ONLY items that match the target card.

TARGET: ${targetDesc}
TODAY: ${todayStr}

RULES:
- match_confidence: 95+=exact, 70-94=near match, below 70=skip
- EXCLUDE: lots, bundles, different player, wrong grade, wrong serial number, ungraded if target is graded
- Keep sold_price, sold_date, item_url, title from the input
- Max 8 results, sorted newest first

LISTINGS:
${JSON.stringify(items.slice(0, 30))}`,
      response_json_schema: {
        type: 'object',
        properties: {
          validated_items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title:            { type: 'string' },
                sold_price:       { type: 'number' },
                sold_date:        { type: ['string', 'null'] },
                item_url:         { type: 'string' },
                match_confidence: { type: 'number' },
              }
            }
          }
        }
      },
      model: 'gemini_3_flash',
      add_context_from_internet: false,
    });
    return (res?.validated_items || []).filter(i => i.sold_price > 0 && i.match_confidence >= minConfidence);
  } catch (_) {
    return [];
  }
}

// ─── FETCH LIVE PSA POP DATA ──────────────────────────────────────────────────
async function fetchLivePop(player, year, set, grade, base44Client) {
  if (!player || !grade) return null;
  const gradeMatch = grade.toUpperCase().match(/PSA\s*(\d+(?:\.\d+)?)/);
  if (!gradeMatch) return null;

  try {
    const query = [player, year, set].filter(Boolean).join(' ');
    const popUrl = `https://www.psacard.com/pop/basketball-cards/?search=${encodeURIComponent(query)}`;
    const popRes = await fetch(popUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!popRes.ok) return null;
    const html = await popRes.text();
    if (html.length < 500 || html.includes('No results')) return null;

    const res = await base44Client.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Parse this PSA population report HTML page. Find the row for: ${player} | Year: ${year || 'any'} | Set: ${set || 'any'} | Grade: ${grade}

Extract:
- pop_at_grade: exact count at grade ${gradeMatch[1]}
- pop_higher: total count of copies graded HIGHER than ${gradeMatch[1]}
- total_pop_all_grades: sum of ALL grade columns for this card row
- highest_grade_achieved: the highest grade column that has any count > 0

Return null for pop_at_grade if you cannot find this exact card row. Do NOT guess.

HTML (first 20KB): ${html.slice(0, 20000)}`,
      response_json_schema: {
        type: 'object',
        properties: {
          pop_at_grade:          { type: ['number', 'null'] },
          pop_higher:            { type: ['number', 'null'] },
          total_pop_all_grades:  { type: ['number', 'null'] },
          highest_grade_achieved:{ type: ['string', 'null'] },
        }
      },
      model: 'gemini_3_flash',
      add_context_from_internet: false,
    });

    if (res?.pop_at_grade != null) {
      const p = res.pop_at_grade;
      const ph = res.pop_higher ?? null;
      const scarcity = p <= 1 ? 'ultra_rare' : p <= 5 ? 'ultra_rare' : p <= 20 ? 'very_rare' : p <= 100 ? 'rare' : p <= 500 ? 'uncommon' : 'common';
      return {
        pop_at_grade: p,
        pop_higher: ph,
        total_pop_all_grades: res.total_pop_all_grades ?? null,
        highest_grade_achieved: res.highest_grade_achieved ?? null,
        scarcity_assessment: scarcity,
        source_confidence: 'high',
        grading_company: 'PSA',
      };
    }
    return null;
  } catch (_) {
    return null;
  }
}

// ─── POP SCORE ────────────────────────────────────────────────────────────────
function popToAttributeScore(popAtGrade, popHigher) {
  if (popAtGrade == null) return null;
  if (popAtGrade === 1 && popHigher === 0) return 100;
  if (popAtGrade === 1) return 97;
  if (popAtGrade <= 5)   return 93;
  if (popAtGrade <= 15)  return 85;
  if (popAtGrade <= 30)  return 75;
  if (popAtGrade <= 75)  return 64;
  if (popAtGrade <= 150) return 50;
  if (popAtGrade <= 300) return 35;
  if (popAtGrade <= 500) return 23;
  return 10;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const cardData = await req.json();

    // ═══════════════════════════════════════════════════════
    // STEP 1 — CANONICAL CARD IDENTITY
    // ═══════════════════════════════════════════════════════
    const { company: grade_company, grade } = normalizeGrade(cardData.grade || '');
    const identity = {
      year:          cardData.card_year    ? parseInt(cardData.card_year)    : null,
      set:           cardData.card_set     || null,
      parallel:      cardData.variation    || null,
      player:        cardData.player_name  || null,
      card_number:   cardData.card_number  || null,
      serial:        cardData.serial_number ? parseInt(cardData.serial_number) : null,
      grade_company: grade_company || null,
      grade,
      rc_flag:       !!cardData.is_rookie_year,
      auto_flag:     !!cardData.has_autograph,
    };

    if (!identity.player) {
      return Response.json({ error: 'player_name is required' }, { status: 400 });
    }

    const todayStr   = new Date().toISOString().split('T')[0];
    const isOneOfOne = identity.serial === 1;

    // Build keyword strings for API queries
    const exactParts  = [identity.player, identity.year, identity.set, identity.parallel, identity.serial ? `/${identity.serial}` : null, cardData.grade].filter(Boolean).map(s => String(s).trim());
    const broadParts  = [identity.player, identity.year, identity.set, cardData.grade].filter(Boolean).map(s => String(s).trim());
    const playerParts = [identity.player, identity.year, identity.set].filter(Boolean).map(s => String(s).trim());

    const _ebay_search_url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(exactParts.join(' '))}&LH_Sold=1&LH_Complete=1&_sop=13`;

    const exactTargetDesc  = `${identity.player} | ${identity.year || ''} | ${identity.set || ''} | ${identity.parallel || 'base'} | ${identity.serial ? '/' + identity.serial : 'no serial'} | ${cardData.grade || 'ungraded'} | auto=${identity.auto_flag}`;
    const broadTargetDesc  = `${identity.player} | ${identity.year || ''} | ${identity.set || ''} | ${cardData.grade || 'ungraded'} — accept similar grade`;
    const similarTargetDesc = `${identity.player} | ${identity.year || ''} | ${identity.set || ''} | ${cardData.grade || 'any grade'} — similar card, any serial/parallel`;

    // ═══════════════════════════════════════════════════════
    // STEP 2 — PARALLEL: Pop report + eBay API comp search
    // ═══════════════════════════════════════════════════════
    const popReportPromise = fetchLivePop(identity.player, identity.year, identity.set, cardData.grade || '', base44);

    // Strategy 1: Apify — exact query (tries both tokens automatically)
    let primaryItems = [];
    let compStrategy = 'none';

    const exactRaw = await fetchEbayViaApify(exactParts.join(' '), 25);
    if (exactRaw.length > 0) {
      const validated = await validateWithLLM(exactRaw, exactTargetDesc, base44, 70);
      if (validated.length > 0) {
        primaryItems = validated;
        compStrategy = 'apify_exact';
      }
    }

    // Strategy 2: Apify — broad query
    if (primaryItems.length === 0) {
      const broadRaw = await fetchEbayViaApify(broadParts.join(' '), 25);
      if (broadRaw.length > 0) {
        const validated = await validateWithLLM(broadRaw, broadTargetDesc, base44, 65);
        if (validated.length > 0) {
          primaryItems = validated;
          compStrategy = 'apify_broad';
        }
      }
    }

    // Strategy 3: AI internet search (last resort)
    if (primaryItems.length === 0) {
      try {
        const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Sports card market expert. Find REAL recent completed eBay sold listings for:
CARD: ${exactParts.join(' ')}
Grade: ${cardData.grade || 'any'} | Auto: ${identity.auto_flag ? 'YES' : 'NO'} | Serial: ${identity.serial ? '/' + identity.serial : 'none'}
CRITICAL: Return ONLY real completed sales. Do NOT fabricate prices. Empty array if no real data found.
Up to 6 most recent sales, newest first. TODAY: ${todayStr}`,
          response_json_schema: {
            type: 'object',
            properties: {
              validated_items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title:            { type: 'string' },
                    sold_price:       { type: 'number' },
                    sold_date:        { type: ['string', 'null'] },
                    item_url:         { type: 'string' },
                    match_confidence: { type: 'number' },
                  }
                }
              }
            }
          },
          model: 'gemini_3_1_pro',
          add_context_from_internet: true,
        });
        const items = (res?.validated_items || []).filter(i => i.sold_price > 0 && i.match_confidence >= 55);
        if (items.length > 0) { primaryItems = items; compStrategy = 'ai_search'; }
      } catch (_) {}
    }

    // ═══════════════════════════════════════════════════════
    // STEP 3 — SIMILAR CARD COMP (for 1/1 and stale >2yr)
    // ═══════════════════════════════════════════════════════
    const sortedExact = primaryItems.length > 0
      ? [...primaryItems].sort((a, b) => (!a.sold_date ? 1 : !b.sold_date ? -1 : new Date(b.sold_date) - new Date(a.sold_date)))
      : [];
    const bestExact = sortedExact[0] || null;
    const bestExactAgeDays = bestExact?.sold_date
      ? (Date.now() - new Date(bestExact.sold_date).getTime()) / 86400000
      : Infinity;

    const needSimilarComp = isOneOfOne || bestExactAgeDays > 730;
    let similarCardComp = null;
    let similarCardCompType = null;

    if (needSimilarComp) {
      similarCardCompType = isOneOfOne ? 'one_of_one' : 'stale_over_2yr';

      // Use Apify for similar cards
      const similarRaw = await fetchEbayViaApify(playerParts.join(' '), 20);
      if (similarRaw.length > 0) {
        const validated = await validateWithLLM(similarRaw, similarTargetDesc, base44, 60);
        if (validated.length > 0) {
          const sorted = validated.sort((a, b) => (!a.sold_date ? 1 : !b.sold_date ? -1 : new Date(b.sold_date) - new Date(a.sold_date)));
          const best = sorted[0];
          similarCardComp = {
            title:      best.title || `${identity.player} ${identity.year || ''} (similar)`,
            sold_price: best.sold_price,
            sold_date:  best.sold_date || null,
            item_url:   best.item_url || null,
            confidence: best.match_confidence,
            all:        sorted.slice(0, 5).map(c => ({ title: c.title, sold_price: c.sold_price, sold_date: c.sold_date, item_url: c.item_url })),
          };
        }
      }

      // Fallback: AI search for similar
      if (!similarCardComp) {
        try {
          const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Find recent eBay sold listings for cards SIMILAR to: ${identity.player} | ${identity.year || 'any'} | ${identity.set || 'any'} | ${cardData.grade || 'any'}
Same player and set, any serial/parallel. Real completed sales only. TODAY: ${todayStr}`,
            response_json_schema: {
              type: 'object',
              properties: {
                validated_items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' }, sold_price: { type: 'number' },
                      sold_date: { type: ['string', 'null'] }, item_url: { type: 'string' },
                      match_confidence: { type: 'number' },
                    }
                  }
                }
              }
            },
            model: 'gemini_3_1_pro',
            add_context_from_internet: true,
          });
          const items = (res?.validated_items || []).filter(i => i.sold_price > 0);
          if (items.length > 0) {
            const sorted = items.sort((a, b) => (!a.sold_date ? 1 : !b.sold_date ? -1 : new Date(b.sold_date) - new Date(a.sold_date)));
            similarCardComp = {
              title:      sorted[0].title,
              sold_price: sorted[0].sold_price,
              sold_date:  sorted[0].sold_date || null,
              item_url:   sorted[0].item_url || null,
              confidence: sorted[0].match_confidence || 60,
              all:        sorted.slice(0, 5).map(c => ({ title: c.title, sold_price: c.sold_price, sold_date: c.sold_date, item_url: c.item_url })),
            };
          }
        } catch (_) {}
      }
    }

    // ═══════════════════════════════════════════════════════
    // STEP 4 — BUILD LAST SOLD + COMPS
    // ═══════════════════════════════════════════════════════
    let lastSold = { last_sold_price: null, last_sold_date: null, last_sold_url: null, match_confidence: 0 };
    let comps = [];

    if (sortedExact.length > 0) {
      const best = sortedExact[0];
      lastSold = {
        last_sold_price:  best.sold_price,
        last_sold_date:   best.sold_date || null,
        last_sold_url:    best.item_url || null,
        match_confidence: best.match_confidence ?? 75,
      };
      comps = sortedExact.slice(1).map(c => ({
        price:    c.sold_price,
        date:     c.sold_date || null,
        title:    c.title || null,
        item_url: c.item_url || null,
        _w:       timeDecayWeight(c.sold_date),
      }));
    }

    // ═══════════════════════════════════════════════════════
    // STEP 5 — SMARTVALUE COMPUTATION
    // ═══════════════════════════════════════════════════════
    const lsp        = lastSold.last_sold_price;
    const lsd        = lastSold.last_sold_date;
    const lsdAgeDays = lsd ? (Date.now() - new Date(lsd).getTime()) / 86400000 : Infinity;
    const compsMedian = comps.length > 0 ? weightedMedian(comps) : null;

    let baseValue  = null;
    let baseAnchor = 'none';

    if (lsp && lsdAgeDays <= 180) {
      baseValue  = compsMedian ? lsp * 0.6 + compsMedian * 0.4 : lsp;
      baseAnchor = 'last_sold';
    } else if (lsp && lsdAgeDays <= 365) {
      baseValue  = compsMedian ? lsp * 0.4 + compsMedian * 0.6 : lsp * timeDecayWeight(lsd);
      baseAnchor = 'last_sold_stale';
    } else if (lsp && lsdAgeDays <= 730) {
      baseValue  = lsp * timeDecayWeight(lsd);
      baseAnchor = 'last_sold_old';
    } else if (compsMedian) {
      baseValue  = compsMedian;
      baseAnchor = 'comps';
    } else if (similarCardComp) {
      baseValue  = similarCardComp.sold_price;
      baseAnchor = 'similar_card';
    }

    const pMult = parallelMultiplier(identity.parallel);
    const sMult = serialScarcityMult(identity.serial);
    let smartValue = baseValue;

    if (smartValue && (baseAnchor === 'similar_card' || baseAnchor !== 'last_sold')) {
      smartValue = smartValue * pMult * sMult;
      if (identity.auto_flag) smartValue *= 1.35;
    }

    if (smartValue && lsp && lsdAgeDays <= 365) {
      if (Math.abs((smartValue - lsp) / lsp) < 0.08) {
        smartValue = lsp * 1.08;
      }
    }

    smartValue = smartValue ? Math.round(smartValue) : null;

    // ─── Anomaly detection ───────────────────────────────
    let anomaly_flag   = false;
    let anomaly_reason = null;
    if (lsp && compsMedian && compsMedian > 0) {
      const ratio = lsp / compsMedian;
      if (ratio > 3)      { anomaly_flag = true; anomaly_reason = `Last sale $${lsp.toLocaleString()} is >3× median comp ($${Math.round(compsMedian).toLocaleString()}) — possible outlier`; }
      else if (ratio < 0.33) { anomaly_flag = true; anomaly_reason = `Last sale $${lsp.toLocaleString()} is <0.33× median comp — possible undervalue outlier`; }
    }

    // ─── Confidence score ─────────────────────────────────
    let confidence = 0;
    const confFactors = [];
    if      ((lastSold.match_confidence ?? 0) >= 90) { confidence += 40; confFactors.push('Exact eBay API match'); }
    else if ((lastSold.match_confidence ?? 0) >= 70) { confidence += 25; confFactors.push('Near-exact eBay match'); }
    else if (lsp)                                     { confidence += 10; confFactors.push('Last sold found'); }
    if      (lsdAgeDays <= 30)  { confidence += 25; confFactors.push('Sale ≤30 days'); }
    else if (lsdAgeDays <= 90)  { confidence += 18; confFactors.push('Sale ≤90 days'); }
    else if (lsdAgeDays <= 180) { confidence += 12; confFactors.push('Sale ≤6 months'); }
    else if (lsdAgeDays <= 365) { confidence += 6;  confFactors.push('Sale ≤12 months'); }
    if (comps.length >= 3) { confidence += 12; confFactors.push(`${comps.length} comps`); }
    if (identity.grade)    { confidence += 5;  confFactors.push('Grade confirmed'); }
    if (identity.serial)   { confidence += 5;  confFactors.push('Serial confirmed'); }
    if (similarCardComp)   { confidence += 8;  confFactors.push('Similar card comp found'); }
    if (compStrategy === 'apify_exact' || compStrategy === 'apify_broad') { confidence += 10; confFactors.push('Apify eBay data'); }
    if (anomaly_flag)      { confidence = Math.max(0, confidence - 15); }
    confidence = Math.min(Math.round(confidence), 99);

    // ─── Tier ─────────────────────────────────────────────
    const tier = isOneOfOne             ? 'one_of_one'
      : lsp && lsdAgeDays <= 180        ? 'exact_match'
      : lsp && lsdAgeDays <= 365        ? 'recent_match'
      : lsp && lsdAgeDays <= 730        ? 'stale_match'
      : similarCardComp                 ? 'similar_card_baseline'
      : 'no_data';

    // ─── Await pop report ─────────────────────────────────
    const livePopReport = await popReportPromise.catch(() => null);
    const popScore = livePopReport ? popToAttributeScore(livePopReport.pop_at_grade, livePopReport.pop_higher) : null;

    // ─── Pop scarcity uplift on smartValue ────────────────
    if (livePopReport?.pop_at_grade != null && smartValue) {
      const p  = livePopReport.pop_at_grade;
      const ph = livePopReport.pop_higher ?? null;
      if (p === 1 && ph === 0) smartValue = Math.round(smartValue * 1.30);
      else if (p === 1)        smartValue = Math.round(smartValue * 1.15);
      else if (p <= 5)         smartValue = Math.round(smartValue * 1.08);
      else if (p > 500)        smartValue = Math.round(smartValue * 0.95);
    }

    // ─── Value drivers ────────────────────────────────────
    const value_drivers = [];
    if (lsp) value_drivers.push(`Last sold $${lsp.toLocaleString()}${lsd ? ' on ' + lsd : ''} (${lastSold.match_confidence ?? 0}% match confidence) via ${compStrategy}`);
    if (pMult !== 1.0) value_drivers.push(`Parallel ${identity.parallel} → ×${pMult} tier multiplier`);
    if (sMult !== 1.0) value_drivers.push(`Serial /${identity.serial} scarcity → ×${sMult} multiplier`);
    if (identity.rc_flag)  value_drivers.push('Rookie Card: strong collector demand premium');
    if (identity.auto_flag) value_drivers.push('Autograph: premium applied');
    if (similarCardComp && baseAnchor === 'similar_card') value_drivers.push(`No direct comp — anchored to similar card sale: $${similarCardComp.sold_price.toLocaleString()}`);
    if (livePopReport?.pop_at_grade != null) {
      const p  = livePopReport.pop_at_grade;
      const ph = livePopReport.pop_higher;
      value_drivers.push(`PSA Pop: ${p} at grade${ph === 0 ? ' — HIGHEST GRADED' : ph != null ? `, ${ph} graded higher` : ''} → pop_score=${popScore}`);
    }

    return Response.json({
      comp_value:           lsp,
      sale_date:            lsd,
      last_sold_url:        lastSold.last_sold_url,
      match_confidence:     lastSold.match_confidence,
      smart_value:          smartValue,
      tier,
      confidence,
      base_anchor:          baseAnchor,
      comp_strategy:        compStrategy,
      anomaly_flag,
      anomaly_reason,
      value_drivers,
      confidence_factors:   confFactors,
      similar_comps:        comps.slice(0, 6).map(c => ({
        sold_price: c.price,
        sold_date:  c.date,
        title:      c.title || `${identity.player} (similar)`,
        item_url:   c.item_url || null,
      })),
      _ebay_search_url,
      similar_card_comp:      similarCardComp,
      similar_card_comp_type: similarCardCompType,
      live_pop_report:        livePopReport,
      pop_attribute_score:    popScore,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});