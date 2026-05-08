import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * SMARTVALUE VALUATION ENGINE — FULL PIPELINE
 * 
 * Step 1: Canonical Card Identity (strict normalization)
 * Step 2: Exact Last Sold (no guessing, sold listings only)
 * Step 3: Comparable Sales (near-matches with grade/parallel adjustments)
 * Step 4: SmartValue Computation (rule-based, time-weighted)
 * Step 5: Confidence Score + Output
 */

// ─── TIME DECAY ─────────────────────────────────────────────────────────────
function timeDecayWeight(dateStr) {
  if (!dateStr) return 0.3;
  const ageDays = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 30)  return 1.0;
  if (ageDays <= 90)  return 0.9;
  if (ageDays <= 180) return 0.75;
  if (ageDays <= 365) return 0.55;
  if (ageDays <= 540) return 0.35;
  return 0.2;
}

// ─── GRADE MULTIPLIERS (PSA scale, empirical) ───────────────────────────────
const PSA_GRADE_MULT = { 10: 1.0, 9: 0.55, 8: 0.32, 7: 0.20, 6: 0.14, 5: 0.10 };
const BGS_GRADE_MULT = { 10: 1.25, 9.5: 1.0, 9: 0.55, 8.5: 0.35, 8: 0.24 };
const SGC_GRADE_MULT = { 10: 0.85, 9: 0.50, 8: 0.30 };

function gradeMultiplier(company, grade) {
  const g = parseFloat(grade);
  if (!g) return 1.0;
  if (company === 'PSA') return PSA_GRADE_MULT[g] ?? 0.15;
  if (company === 'BGS') return BGS_GRADE_MULT[g] ?? 0.20;
  if (company === 'SGC') return SGC_GRADE_MULT[g] ?? 0.30;
  return 1.0; // RAW or unknown
}

// ─── WEIGHTED MEDIAN ─────────────────────────────────────────────────────────
function weightedMedian(items) {
  if (!items.length) return null;
  // Sort by price, apply time-decay weights, pick weighted midpoint
  const sorted = [...items].sort((a, b) => a.price - b.price);
  const totalWeight = sorted.reduce((s, i) => s + (i._weight || 1), 0);
  let cumulative = 0;
  for (const item of sorted) {
    cumulative += (item._weight || 1);
    if (cumulative >= totalWeight / 2) return item.price;
  }
  return sorted[Math.floor(sorted.length / 2)].price;
}

// ─── NORMALIZE GRADE ─────────────────────────────────────────────────────────
function normalizeGrade(gradeStr) {
  if (!gradeStr) return { company: 'RAW', grade: null };
  const upper = gradeStr.toUpperCase().trim();
  const psaMatch = upper.match(/PSA\s*(\d+(?:\.\d+)?)/);
  if (psaMatch) return { company: 'PSA', grade: parseFloat(psaMatch[1]) };
  const bgsMatch = upper.match(/BGS\s*(\d+(?:\.\d+)?)/);
  if (bgsMatch) return { company: 'BGS', grade: parseFloat(bgsMatch[1]) };
  const sgcMatch = upper.match(/SGC\s*(\d+(?:\.\d+)?)/);
  if (sgcMatch) return { company: 'SGC', grade: parseFloat(sgcMatch[1]) };
  return { company: 'RAW', grade: null };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const cardData = await req.json();

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: CANONICAL CARD IDENTITY
    // ═══════════════════════════════════════════════════════════════════
    const gradeNorm = normalizeGrade(cardData.grade || '');
    const identity = {
      year:         cardData.card_year ? parseInt(cardData.card_year) : null,
      set:          cardData.card_set || null,
      subset:       cardData.subset || null,
      parallel:     cardData.variation || null,
      player:       cardData.player_name || null,
      team:         cardData.team || null,
      card_number:  cardData.card_number || null,
      serial:       cardData.serial_number ? parseInt(cardData.serial_number) : null,
      grade_company: gradeNorm.company || null,
      grade:        gradeNorm.grade,
      rc_flag:      !!cardData.is_rookie_year,
      auto_flag:    !!cardData.has_autograph,
    };

    if (!identity.player) {
      return Response.json({ error: 'player is required for SmartValue' }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2 + 3: FETCH EXACT LAST SOLD + COMPS via fetchLiveSoldComps
    // ═══════════════════════════════════════════════════════════════════
    let lastSoldData = null;
    let comps = [];

    try {
      const compRes = await base44.asServiceRole.functions.invoke('fetchLiveSoldComps', cardData);
      const cd = compRes?.data || {};

      if (cd.comp_value && cd.comp_value > 0) {
        lastSoldData = {
          last_sold_price: cd.comp_value,
          last_sold_date:  cd.sale_date || null,
          last_sold_url:   cd.last_sold_url || null,
          match_confidence: cd.match_confidence ?? 85,
          error: null,
        };
      }

      // Build comps array from similar_comps
      comps = (cd.similar_comps || [])
        .filter(c => c.sold_price > 0)
        .map(c => {
          const cg = normalizeGrade(c.grade || '');
          return {
            price:        c.sold_price,
            date:         c.sold_date || null,
            grade_company: cg.company,
            grade:        cg.grade,
            parallel:     c.parallel || null,
            serial:       c.serial || null,
            source:       'eBay',
            _weight:      timeDecayWeight(c.sold_date),
          };
        });
    } catch (_) {
      // fetchLiveSoldComps failed — continue without comp data
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: SMARTVALUE COMPUTATION (RULE-BASED)
    // ═══════════════════════════════════════════════════════════════════
    const lastSoldPrice  = lastSoldData?.last_sold_price || null;
    const lastSoldDate   = lastSoldData?.last_sold_date || null;
    const lastSoldAgeDays = lastSoldDate
      ? (Date.now() - new Date(lastSoldDate).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    const compsMedian = comps.length > 0 ? weightedMedian(comps) : null;

    // ── Base Anchor ─────────────────────────────────────────────────────
    let baseValue = null;
    let anchorSource = 'none';

    if (lastSoldPrice && lastSoldAgeDays <= 180) {
      // Recent exact match — 60% weight on last sold, 40% on comps median (if available)
      if (compsMedian) {
        baseValue = lastSoldPrice * 0.6 + compsMedian * 0.4;
      } else {
        baseValue = lastSoldPrice;
      }
      anchorSource = 'last_sold_primary';
    } else if (lastSoldPrice && lastSoldAgeDays <= 365) {
      // Stale last sold — equal weight
      if (compsMedian) {
        baseValue = lastSoldPrice * 0.4 + compsMedian * 0.6;
      } else {
        baseValue = lastSoldPrice * timeDecayWeight(lastSoldDate);
      }
      anchorSource = 'last_sold_stale';
    } else if (compsMedian) {
      baseValue = compsMedian;
      anchorSource = 'comps_only';
    } else if (lastSoldPrice) {
      baseValue = lastSoldPrice * timeDecayWeight(lastSoldDate);
      anchorSource = 'last_sold_old';
    }

    // ── Grade Adjustment ────────────────────────────────────────────────
    // Infer from comps: find a comp with same card/player but known grade, compute ratio
    let gradeAdjustedValue = baseValue;
    let gradeAdjustmentApplied = false;

    if (baseValue && identity.grade && comps.length > 0) {
      const subjectMult = gradeMultiplier(identity.grade_company, identity.grade);
      const gradedComps = comps.filter(c => c.grade && c.grade_company === identity.grade_company);
      if (gradedComps.length > 0) {
        // Use the comp closest in grade as the reference
        const sortedByGrade = gradedComps.sort((a, b) =>
          Math.abs(b.grade - identity.grade) - Math.abs(a.grade - identity.grade)
        );
        const refComp = sortedByGrade[0];
        const refMult = gradeMultiplier(refComp.grade_company, refComp.grade);
        if (refMult > 0 && subjectMult > 0) {
          gradeAdjustedValue = refComp.price * (subjectMult / refMult);
          gradeAdjustmentApplied = true;
        }
      }
    }

    // Use grade-adjusted value if available and reasonable, else stick with base
    const smartBase = gradeAdjustmentApplied
      ? (gradeAdjustedValue * 0.5 + (baseValue || gradeAdjustedValue) * 0.5)
      : baseValue;

    // ── Parallel Adjustment ─────────────────────────────────────────────
    // Rule-based: if no exact parallel match in comps, apply known tier multipliers
    const PARALLEL_TIERS = {
      // Premium
      '1/1': 10.0, 'superfractor': 8.0, 'logoman': 6.0, 'gold vinyl': 5.0,
      // High
      'gold': 2.5, 'gold refractor': 2.5, 'black': 2.0, 'black refractor': 2.2,
      'red': 1.8, 'red refractor': 1.8, 'orange': 1.6, 'pink': 1.5,
      // Mid
      'blue': 1.3, 'blue refractor': 1.3, 'green': 1.2, 'purple': 1.25,
      'gold wave': 1.4, 'wave': 1.2,
      // Base parallels
      'silver prizm': 1.5, 'silver': 1.4, 'cracked ice': 1.3,
      'holo': 1.2, 'hyper': 1.1, 'disco': 1.1,
      // Base
      'base': 1.0, '': 1.0,
    };

    function getParallelMult(p) {
      if (!p) return 1.0;
      const key = p.toLowerCase().trim();
      for (const [k, v] of Object.entries(PARALLEL_TIERS)) {
        if (key.includes(k)) return v;
      }
      return 1.0;
    }

    // ── Serial Scarcity Adjustment ──────────────────────────────────────
    function serialScarcityMult(serial) {
      if (!serial) return 1.0;
      const n = parseInt(serial);
      if (n === 1)   return 5.0;
      if (n <= 5)    return 3.5;
      if (n <= 10)   return 2.5;
      if (n <= 25)   return 1.8;
      if (n <= 49)   return 1.5;
      if (n <= 75)   return 1.3;
      if (n <= 99)   return 1.2;
      if (n <= 149)  return 1.1;
      if (n <= 249)  return 1.05;
      return 1.0;
    }

    const parallelMult = getParallelMult(identity.parallel);
    const serialMult   = serialScarcityMult(identity.serial);

    // Only apply parallel/serial mult if we don't have an exact last sold
    // (if we have exact last sold, it already reflects the parallel/serial)
    let finalSmartValue = smartBase;
    if (anchorSource !== 'last_sold_primary' && finalSmartValue) {
      finalSmartValue = finalSmartValue * parallelMult * serialMult;
    }

    // ── Auto/Patch Adjustment (if no exact match) ──────────────────────
    if (anchorSource !== 'last_sold_primary' && finalSmartValue) {
      if (identity.auto_flag) finalSmartValue *= 1.35;
    }

    // ── Enforce minimum 8% difference from last sold ───────────────────
    if (finalSmartValue && lastSoldPrice && lastSoldAgeDays <= 365) {
      const diffPct = Math.abs((finalSmartValue - lastSoldPrice) / lastSoldPrice);
      if (diffPct < 0.08) {
        finalSmartValue = lastSoldPrice * 1.08;
      }
    }

    finalSmartValue = finalSmartValue ? Math.round(finalSmartValue) : null;

    // ─── STEP 5: CONFIDENCE SCORE ─────────────────────────────────────────
    let confidence = 0;
    const confidenceFactors = [];

    if (lastSoldData?.match_confidence >= 90) {
      confidence += 40;
      confidenceFactors.push('Exact eBay match (high confidence)');
    } else if (lastSoldData?.match_confidence >= 70) {
      confidence += 25;
      confidenceFactors.push('Near-exact eBay match');
    } else if (lastSoldPrice) {
      confidence += 10;
      confidenceFactors.push('Last sold found (lower match confidence)');
    }

    if (lastSoldAgeDays <= 30)  { confidence += 25; confidenceFactors.push('Sale within 30 days'); }
    else if (lastSoldAgeDays <= 90)  { confidence += 18; confidenceFactors.push('Sale within 90 days'); }
    else if (lastSoldAgeDays <= 180) { confidence += 12; confidenceFactors.push('Sale within 6 months'); }
    else if (lastSoldAgeDays <= 365) { confidence += 6;  confidenceFactors.push('Sale within 12 months'); }

    if (comps.length >= 5)  { confidence += 20; confidenceFactors.push('5+ comparable sales'); }
    else if (comps.length >= 3) { confidence += 12; confidenceFactors.push('3–4 comparable sales'); }
    else if (comps.length >= 1) { confidence += 5;  confidenceFactors.push('1–2 comparable sales'); }

    if (identity.grade)    { confidence += 5;  confidenceFactors.push('Grade confirmed'); }
    if (identity.year)     { confidence += 3;  confidenceFactors.push('Year confirmed'); }
    if (identity.set)      { confidence += 3;  confidenceFactors.push('Set confirmed'); }
    if (identity.serial)   { confidence += 5;  confidenceFactors.push('Serial confirmed'); }

    confidence = Math.min(confidence, 99);

    // ── Tier ────────────────────────────────────────────────────────────
    const tier = lastSoldPrice && lastSoldAgeDays <= 180 ? 'exact_match'
      : lastSoldPrice && lastSoldAgeDays <= 365         ? 'recent_match'
      : comps.length > 0                                ? 'comps_based'
      : 'no_data';

    // ── Value Drivers summary ───────────────────────────────────────────
    const valueDrivers = [];
    if (lastSoldPrice) valueDrivers.push({
      label: 'Last Sold Anchor',
      dollar_adjustment: `$${lastSoldPrice.toLocaleString()}`,
      percent_adjustment: '',
      reason: `Most recent sold: $${lastSoldPrice.toLocaleString()}${lastSoldDate ? ' on ' + lastSoldDate : ''}`,
    });
    if (identity.grade && gradeAdjustmentApplied) valueDrivers.push({
      label: `Grade: ${identity.grade_company} ${identity.grade}`,
      dollar_adjustment: `$${Math.round(((gradeMultiplier(identity.grade_company, identity.grade) - 1) * (lastSoldPrice || 0))).toLocaleString()}`,
      percent_adjustment: `${((gradeMultiplier(identity.grade_company, identity.grade) - 1) * 100).toFixed(0)}%`,
      reason: 'Grade premium applied from comp analysis',
    });
    if (identity.parallel && parallelMult !== 1.0) valueDrivers.push({
      label: `Parallel: ${identity.parallel}`,
      dollar_adjustment: '',
      percent_adjustment: `${((parallelMult - 1) * 100).toFixed(0)}%`,
      reason: 'Parallel tier premium',
    });
    if (identity.serial && serialMult !== 1.0) valueDrivers.push({
      label: `Serial /${identity.serial}`,
      dollar_adjustment: '',
      percent_adjustment: `+${((serialMult - 1) * 100).toFixed(0)}%`,
      reason: `Scarcity premium: only ${identity.serial} copies exist`,
    });
    if (identity.rc_flag) valueDrivers.push({
      label: 'Rookie Card',
      dollar_adjustment: '',
      percent_adjustment: '',
      reason: 'RC designation commands collector premium',
    });
    if (identity.auto_flag && anchorSource !== 'last_sold_primary') valueDrivers.push({
      label: 'Autograph',
      dollar_adjustment: '',
      percent_adjustment: '+35%',
      reason: 'Auto premium applied (no exact auto comp found)',
    });

    return Response.json({
      // Identity
      identity,

      // Last Sold
      last_sold: lastSoldData || { last_sold_price: null, last_sold_date: null, last_sold_url: null, match_confidence: 0, error: 'No sold listing found' },

      // Comps
      comps: comps.map(c => ({
        price: c.price,
        date: c.date,
        grade_company: c.grade_company,
        grade: c.grade,
        parallel: c.parallel,
        serial: c.serial,
        source: c.source,
      })),

      // SmartValue
      smart_value: finalSmartValue,
      anchor_source: anchorSource,
      confidence,
      confidence_factors: confidenceFactors,
      tier,

      // Waterfall
      value_drivers: valueDrivers,

      // Pass-through for UI
      comp_value: lastSoldPrice,
      sale_date: lastSoldDate,
      last_sold_url: lastSoldData?.last_sold_url || null,
      match_confidence: lastSoldData?.match_confidence || 0,
      similar_comps: comps.slice(0, 6).map(c => ({
        sold_price: c.price,
        sold_date: c.date,
        title: [c.grade_company, c.grade, c.parallel].filter(Boolean).join(' '),
        item_url: null,
      })),
      _ebay_search_url: null,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});