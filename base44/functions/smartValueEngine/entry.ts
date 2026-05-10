import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * SMARTVALUE ENGINE — FULL PIPELINE
 *
 * 1. Canonical Card Identity (strict normalization)
 * 2. Exact Last Sold (sold listings only, strict match)
 * 3. Comparable Sales (near-matches)
 * 4. SmartValue Computation (rule-based, time-weighted)
 * 5. Anomaly Detection
 * 6. Final JSON Output
 */

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

// ─── GRADE MULTIPLIERS (PSA anchor = 10) ─────────────────────────────────────
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
  [['black refractor', 'black'], 2.2],
  [['gold refractor', 'gold'], 2.5],
  [['red refractor', 'red'], 1.8],
  [['orange'], 1.6],
  [['pink'], 1.5],
  [['blue refractor', 'blue'], 1.3],
  [['purple'], 1.25],
  [['silver prizm', 'silver'], 1.4],
  [['cracked ice'], 1.3],
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
      year:         cardData.card_year  ? parseInt(cardData.card_year)  : null,
      set:          cardData.card_set   || null,
      subset:       cardData.subset     || null,
      parallel:     cardData.variation  || null,
      player:       cardData.player_name || null,
      team:         cardData.team       || null,
      card_number:  cardData.card_number || null,
      serial:       cardData.serial_number ? parseInt(cardData.serial_number) : null,
      grade_company: grade_company || null,
      grade,
      rc_flag:  !!cardData.is_rookie_year,
      auto_flag: !!cardData.has_autograph,
    };

    if (!identity.player) {
      return Response.json({ error: 'player_name is required' }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════
    // STEP 2 + 3 — EXACT LAST SOLD + COMPS (inlined)
    // ═══════════════════════════════════════════════════════
    let lastSold = { last_sold_price: null, last_sold_date: null, last_sold_url: null, match_confidence: 0, error: 'No data' };
    let comps = [];
    let _ebay_search_url = null;

    try {
      // Build search queries — exact first, broad fallback
      const exactParts = [
        identity.player,
        identity.year ? String(identity.year) : '',
        identity.set || '',
        identity.parallel || '',
        identity.serial ? `/${identity.serial}` : '',
        cardData.grade || '',
      ].map(s => String(s).trim()).filter(Boolean);

      const broadParts = [
        identity.player,
        identity.year ? String(identity.year) : '',
        identity.set || '',
        cardData.grade || '',
      ].map(s => String(s).trim()).filter(Boolean);

      const exactQuery    = exactParts.join(' ');
      const broadQuery    = broadParts.join(' ');
      const exactEncoded  = encodeURIComponent(exactQuery);
      const broadEncoded  = encodeURIComponent(broadQuery);

      _ebay_search_url = `https://www.ebay.com/sch/i.html?_nkw=${exactEncoded}&LH_Sold=1&LH_Complete=1&_sop=13&_ipg=60`;
      const todayStr = new Date().toISOString().split('T')[0];

      const compSchema = {
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
      };

      // ── Helper: fetch eBay sold listings HTML ─────────────────────
      async function fetchEbayHtml(encodedQuery) {
        const url = `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}&LH_Sold=1&LH_Complete=1&_sop=13&_ipg=60`;
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: AbortSignal.timeout(12000),
        });
        if (!resp.ok) return '';
        const text = await resp.text();
        // Extract just the sold listings portion to reduce token count
        const start = text.indexOf('srp-results');
        const end   = text.indexOf('</ul>', start + 1);
        if (start > -1 && end > -1) return text.slice(start, Math.min(end + 5, start + 60000));
        return text.slice(0, 60000);
      }

      // ── Helper: parse HTML with LLM ──────────────────────────────
      async function parseHtmlWithLLM(html, targetDesc) {
        const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are an expert sports card sold-listing analyst. Parse this eBay sold listings HTML and extract ONLY matching sold sales.

TARGET CARD: ${targetDesc}
TODAY: ${todayStr}

STRICT RULES:
- Extract title, sold_price (number, USD only), sold_date (YYYY-MM-DD), item_url (full eBay URL), match_confidence (0-100)
- match_confidence: 95+=exact match, 70-94=near match, below 70=skip
- EXCLUDE: lots, bundles, wrong player, wrong grade company, wrong grade number, different serial, ungraded if target is graded
- sold_price must be the HAMMER PRICE (green "Sold" price), not asking price
- sold_date: extract from text like "Sold Jan 15, 2025" → "2025-01-15"
- item_url: construct as https://www.ebay.com/itm/ITEMNUMBER if you find the item ID
- Sort by sold_date descending (newest first), max 8 items
- If price shows as auction with multiple bids, use the final bid price
- ONLY return items where sold_price > 0

HTML:
${html}`,
          response_json_schema: compSchema,
          model: 'gemini_3_flash',
          add_context_from_internet: false,
        });
        return (res?.validated_items || []).filter(i => i.sold_price > 0 && i.match_confidence >= 70);
      }

      let primaryItems = [];

      // ── STRATEGY 1: Direct eBay scrape (exact query) ─────────────
      try {
        const html = await fetchEbayHtml(exactEncoded);
        if (html.length > 500) {
          const targetDesc = `${identity.player} | Year: ${identity.year || 'any'} | Set: ${identity.set || 'any'} | Parallel: ${identity.parallel || 'base'} | Serial: ${identity.serial ? '/' + identity.serial : 'none'} | Grade: ${cardData.grade || 'any'} | Auto: ${cardData.has_autograph ? 'yes' : 'no'}`;
          primaryItems = await parseHtmlWithLLM(html, targetDesc);
        }
      } catch (_) {}

      // ── STRATEGY 2: Direct eBay scrape (broad query) ─────────────
      if (primaryItems.length === 0 && broadQuery !== exactQuery) {
        try {
          const html = await fetchEbayHtml(broadEncoded);
          if (html.length > 500) {
            const targetDesc = `${identity.player} | Year: ${identity.year || 'any'} | Set: ${identity.set || 'any'} | Grade: ${cardData.grade || 'any'} (accept nearby grades)`;
            const items = await parseHtmlWithLLM(html, targetDesc);
            primaryItems = items.filter(i => i.match_confidence >= 65);
          }
        } catch (_) {}
      }

      // ── STRATEGY 3: Apify (if token configured) ──────────────────
      if (primaryItems.length === 0) {
        const apifyToken = Deno.env.get('APIFY_TOKEN') || '';
        if (apifyToken.length > 0) {
          try {
            const apifyRes = await fetch(
              'https://api.apify.com/v2/actor-tasks/heropuppeteer~ebay-sold-listings-scraper/run-sync?token=' + apifyToken,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords: exactQuery, maxResults: 60, includeActiveListings: false, includeSoldListings: true }),
                signal: AbortSignal.timeout(12000),
              }
            );
            if (apifyRes.ok) {
              const data = await apifyRes.json();
              if (data.output?.results?.length > 0) {
                const targetDesc = `${identity.player} | Year: ${identity.year || 'any'} | Set: ${identity.set || 'any'} | Grade: ${cardData.grade || 'any'}`;
                primaryItems = await parseHtmlWithLLM(JSON.stringify(data.output.results), targetDesc);
              }
            }
          } catch (_) {}
        }
      }

      // ── STRATEGY 4: AI internet search (last resort) ─────────────
      if (primaryItems.length === 0) {
        try {
          const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are a sports card sales expert with access to eBay sold listings data. Find REAL recent completed eBay sales for this exact card.

CARD: ${exactQuery}
Grade: ${cardData.grade || 'any'} | Auto: ${cardData.has_autograph === false ? 'NO' : cardData.has_autograph ? 'YES' : 'unknown'} | Serial: ${identity.serial ? '/' + identity.serial : 'none'}

RULES:
- Search eBay completed/sold listings only (LH_Sold=1)
- Return ONLY actual completed sales with real hammer prices
- Match grade company AND grade number exactly if graded
- Do NOT fabricate — only include sales you can find via search
- Include eBay item URL when available
- Up to 6 most recent sales, newest first
TODAY: ${todayStr}`,
            response_json_schema: compSchema,
            model: 'gemini_3_1_pro',
            add_context_from_internet: true,
          });
          primaryItems = (res?.validated_items || []).filter(i => i.sold_price > 0 && i.match_confidence >= 55);
        } catch (_) {}
      }

      if (primaryItems.length > 0) {
        const sorted = primaryItems.sort((a, b) => {
          if (!a.sold_date) return 1;
          if (!b.sold_date) return -1;
          return new Date(b.sold_date) - new Date(a.sold_date);
        });
        const best = sorted[0];
        lastSold = {
          last_sold_price:  best.sold_price,
          last_sold_date:   best.sold_date || null,
          last_sold_url:    best.item_url || null,
          match_confidence: best.match_confidence ?? 75,
          error: null,
        };
        comps = sorted.slice(1).map(c => ({
          price:         c.sold_price,
          date:          c.sold_date || null,
          grade_company: identity.grade_company,
          grade:         identity.grade,
          parallel:      identity.parallel || null,
          serial:        identity.serial || null,
          source:        'eBay',
          title:         c.title || null,
          item_url:      c.item_url || null,
          _w:            timeDecayWeight(c.sold_date),
        }));
      }
    } catch (e) {
      lastSold.error = e.message || 'comp lookup failed';
    }

    // ═══════════════════════════════════════════════════════
    // STEP 4 — SMARTVALUE COMPUTATION
    // ═══════════════════════════════════════════════════════
    const lsp       = lastSold.last_sold_price;
    const lsd       = lastSold.last_sold_date;
    const lsdAgeDays = lsd ? (Date.now() - new Date(lsd).getTime()) / 86400000 : Infinity;
    const compsMedian = comps.length > 0 ? weightedMedian(comps) : null;

    // 1. Base Anchor
    let baseValue   = null;
    let baseAnchor  = 'comps';

    if (lsp && lsdAgeDays <= 180) {
      baseValue  = compsMedian ? lsp * 0.6 + compsMedian * 0.4 : lsp;
      baseAnchor = 'last_sold';
    } else if (lsp && lsdAgeDays <= 365) {
      baseValue  = compsMedian ? lsp * 0.4 + compsMedian * 0.6 : lsp * timeDecayWeight(lsd);
      baseAnchor = 'last_sold';
    } else if (compsMedian) {
      baseValue  = compsMedian;
      baseAnchor = 'comps';
    } else if (lsp) {
      baseValue  = lsp * timeDecayWeight(lsd);
      baseAnchor = 'last_sold';
    }

    // 2. Grade Adjustment (only when we have comp grades to reference)
    let gradeAdjValue = baseValue;
    const subjectMult = gradeMultiplier(identity.grade_company, identity.grade);
    const gradedComps = comps.filter(c => c.grade && c.grade_company === identity.grade_company);
    if (gradedComps.length > 0 && identity.grade) {
      const ref = [...gradedComps].sort((a, b) => Math.abs(a.grade - identity.grade) - Math.abs(b.grade - identity.grade))[0];
      const refMult = gradeMultiplier(ref.grade_company, ref.grade);
      if (refMult > 0) gradeAdjValue = ref.price * (subjectMult / refMult);
    }
    const combinedBase = gradeAdjValue !== baseValue
      ? gradeAdjValue * 0.5 + (baseValue || gradeAdjValue) * 0.5
      : baseValue;

    // 3. Parallel + Serial Adjustment (only when not exact last_sold match)
    const pMult = parallelMultiplier(identity.parallel);
    const sMult = serialScarcityMult(identity.serial);
    let smartValue = combinedBase;
    if (baseAnchor !== 'last_sold' && smartValue) {
      smartValue = smartValue * pMult * sMult;
      if (identity.auto_flag) smartValue *= 1.35;
    }

    // 4. Enforce minimum 8% divergence from last sold
    if (smartValue && lsp && lsdAgeDays <= 365) {
      if (Math.abs((smartValue - lsp) / lsp) < 0.08) {
        smartValue = lsp * 1.08;
      }
    }

    smartValue = smartValue ? Math.round(smartValue) : null;

    // 5. Range
    const low_estimate  = smartValue ? Math.round(smartValue * 0.90) : null;
    const high_estimate = smartValue ? Math.round(smartValue * 1.10) : null;

    // ═══════════════════════════════════════════════════════
    // STEP 5 — ANOMALY DETECTION
    // ═══════════════════════════════════════════════════════
    let anomaly_flag   = false;
    let anomaly_reason = null;
    if (lsp && compsMedian && compsMedian > 0) {
      const ratio = lsp / compsMedian;
      if (ratio > 3) {
        anomaly_flag   = true;
        anomaly_reason = `Last sale $${lsp.toLocaleString()} is >3× the median comp ($${Math.round(compsMedian).toLocaleString()}) — possible outlier`;
      } else if (ratio < 0.33) {
        anomaly_flag   = true;
        anomaly_reason = `Last sale $${lsp.toLocaleString()} is <0.33× the median comp ($${Math.round(compsMedian).toLocaleString()}) — possible undervalue outlier`;
      }
    }

    // ─── Confidence Score ─────────────────────────────────
    let confidence = 0;
    const confFactors = [];
    if ((lastSold.match_confidence ?? 0) >= 90)      { confidence += 40; confFactors.push('Exact eBay match'); }
    else if ((lastSold.match_confidence ?? 0) >= 70) { confidence += 25; confFactors.push('Near-exact eBay match'); }
    else if (lsp)                                     { confidence += 10; confFactors.push('Last sold (low confidence)'); }

    if      (lsdAgeDays <= 30)  { confidence += 25; confFactors.push('Sale ≤30 days'); }
    else if (lsdAgeDays <= 90)  { confidence += 18; confFactors.push('Sale ≤90 days'); }
    else if (lsdAgeDays <= 180) { confidence += 12; confFactors.push('Sale ≤6 months'); }
    else if (lsdAgeDays <= 365) { confidence += 6;  confFactors.push('Sale ≤12 months'); }

    if      (comps.length >= 5) { confidence += 20; confFactors.push('5+ comps'); }
    else if (comps.length >= 3) { confidence += 12; confFactors.push('3–4 comps'); }
    else if (comps.length >= 1) { confidence += 5;  confFactors.push('1–2 comps'); }

    if (identity.grade)      { confidence += 5; confFactors.push('Grade confirmed'); }
    if (identity.year)       { confidence += 3; confFactors.push('Year confirmed'); }
    if (identity.set)        { confidence += 3; confFactors.push('Set confirmed'); }
    if (identity.serial)     { confidence += 5; confFactors.push('Serial confirmed'); }
    if (anomaly_flag)        { confidence = Math.max(0, confidence - 15); }

    confidence = Math.min(Math.round(confidence), 99);

    // ─── Value Drivers ────────────────────────────────────
    const value_drivers = [];
    if (lsp) value_drivers.push(`Recent sale strength: Last sold $${lsp.toLocaleString()}${lsd ? ' on ' + lsd : ''} (${lastSold.match_confidence ?? 0}% match confidence)`);
    if (identity.grade && gradeAdjValue !== baseValue) {
      const pct = (((subjectMult / gradeMultiplier(gradedComps[0]?.grade_company, gradedComps[0]?.grade)) - 1) * 100).toFixed(0);
      value_drivers.push(`Grade impact: ${identity.grade_company} ${identity.grade} → ${pct > 0 ? '+' : ''}${pct}% vs reference comp`);
    }
    if (identity.parallel && pMult !== 1.0) value_drivers.push(`Parallel impact: ${identity.parallel} → ×${pMult} tier multiplier`);
    if (identity.serial && sMult !== 1.0)   value_drivers.push(`Scarcity/pop report: Serial /${identity.serial} → ×${sMult} scarcity multiplier`);
    if (identity.rc_flag) value_drivers.push('Rookie Card: RC premium applies — strong collector demand');
    if (identity.auto_flag && baseAnchor !== 'last_sold') value_drivers.push('Autograph: +35% auto premium applied (no exact auto comp)');

    // ═══════════════════════════════════════════════════════
    // STEP 6 — FINAL OUTPUT
    // ═══════════════════════════════════════════════════════

    // Tier for UI
    const tier = lsp && lsdAgeDays <= 180 ? 'exact_match'
      : lsp && lsdAgeDays <= 365          ? 'recent_match'
      : comps.length > 0                  ? 'comps_based'
      : 'no_data';

    return Response.json({
      // ── Core SmartValue spec output ──────────────────────
      card_identity: identity,
      last_sold: lastSold,
      comps: comps.map(({ _w, ...c }) => c),  // strip internal weight field
      smart_value: smartValue,
      low_estimate,
      high_estimate,
      confidence,
      base_anchor: baseAnchor,
      anomaly_flag,
      anomaly_reason,
      value_drivers,

      // ── Pass-through fields for ValuateCard UI ───────────
      comp_value:       lsp,
      sale_date:        lsd,
      last_sold_url:    lastSold.last_sold_url,
      match_confidence: lastSold.match_confidence,
      tier,
      notes:            confFactors.join(' · '),
      similar_comps:    comps.slice(0, 6).map(({ _w, ...c }) => ({
        sold_price: c.price,
        sold_date:  c.date,
        title:      c.title || [c.grade_company, c.grade, c.parallel].filter(Boolean).join(' '),
        item_url:   c.item_url || null,
      })),
      _ebay_search_url: _ebay_search_url,
      anchor_source:    baseAnchor,
      confidence_factors: confFactors,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});