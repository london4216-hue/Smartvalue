import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Helper: format dollars
function fmt(n) {
  const rounded = Math.round(n);
  const abs = Math.abs(rounded).toLocaleString('en-US');
  if (rounded > 0) return `+$${abs}`;
  if (rounded < 0) return `-$${abs}`;
  return `$0`;
}

// Helper: parse percent string to number
function parsePercent(raw) {
  const isNeg = String(raw || "0").includes('-');
  const numStr = String(raw || "0").replace(/[^0-9.]/g, '');
  const val = (parseFloat(numStr) || 0) * (isNeg ? -1 : 1);
  return val;
}

// Eye-appeal grade to percent adjustment
function getEyeAppealPercent(grade) {
  const map = {
    'A': { min: 0.05, max: 0.12 },
    'B': { min: 0.00, max: 0.03 },
    'C': { min: -0.12, max: -0.05 },
    'D': { min: -0.25, max: -0.15 }
  };
  const config = map[grade] || map['B'];
  return (config.min + config.max) / 2;
}

// Assign attribute to category
function categorizeAttribute(label) {
  const lower = (label || '').toLowerCase();
  
  if (lower.includes('serial') || lower.includes('print') || lower.includes('low_serial') || lower.includes('one_of_one')) return 'scarcity_population';
  if (lower.includes('auto') || lower.includes('patch') || lower.includes('rpa')) return 'card_dna';
  if (lower.includes('viral') || lower.includes('momentum') || lower.includes('trending') || lower.includes('liquidity')) return 'market_momentum';
  if (lower.includes('player') || lower.includes('hall') || lower.includes('career') || lower.includes('legacy') || lower.includes('legacy') || lower.includes('goat')) return 'player_thesis';
  if (lower.includes('injury') || lower.includes('bust') || lower.includes('risk') || lower.includes('supply') || lower.includes('uncertain')) return 'risk_adjustments';
  
  // Default categories
  if (lower.includes('set') || lower.includes('brand') || lower.includes('grade') || lower.includes('variation') || lower.includes('condition') || lower.includes('rookie')) return 'card_dna';
  if (lower.includes('pop') || lower.includes('rarity')) return 'scarcity_population';
  
  return 'card_dna'; // fallback
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { last_sold_price, grade, attributes, ai_eye_appeal_grade } = body;

    if (!last_sold_price || !grade || !Array.isArray(attributes)) {
      return Response.json({
        error: "Missing required fields: last_sold_price, grade, attributes"
      }, { status: 400 });
    }

    const lastSold = parseFloat(last_sold_price);

    // ─────────────────────────────────────────────────────────
    // Step 1: Convert attributes to dollar adjustments
    // ─────────────────────────────────────────────────────────
    const attributeDrivers = attributes
      .map(attr => {
        const percentVal = parsePercent(attr.percent_adjustment);
        const dollarVal = Math.round(lastSold * (percentVal / 100));
        return {
          label: attr.label,
          percent_adjustment: `${percentVal >= 0 ? '+' : ''}${percentVal}%`,
          percentValue: percentVal,
          dollarAdjustment: dollarVal,
          reason: attr.reason || "Market factor analysis",
          category: categorizeAttribute(attr.label)
        };
      })
      .sort((a, b) => Math.abs(b.dollarAdjustment) - Math.abs(a.dollarAdjustment));

    // ─────────────────────────────────────────────────────────
    // Step 2: Separate top drivers (6-8) from supporting
    // ─────────────────────────────────────────────────────────
    const topCount = Math.min(8, Math.max(6, Math.ceil(attributeDrivers.length * 0.3)));
    const topDrivers = attributeDrivers.slice(0, topCount);
    const supporting = attributeDrivers.slice(topCount);

    // ─────────────────────────────────────────────────────────
    // Step 3: Eye-appeal adjustment
    // ─────────────────────────────────────────────────────────
    const eyeAppealPercent = getEyeAppealPercent(ai_eye_appeal_grade);
    const eyeAppealDollar = Math.round(lastSold * eyeAppealPercent);

    // ─────────────────────────────────────────────────────────
    // Step 4: Compute category impacts
    // ─────────────────────────────────────────────────────────
    const categoryImpact = {
      card_dna: 0,
      scarcity_population: 0,
      market_momentum: 0,
      player_thesis: 0,
      risk_adjustments: 0
    };
    attributeDrivers.forEach(d => {
      categoryImpact[d.category] += d.dollarAdjustment;
    });

    // ─────────────────────────────────────────────────────────
    // Step 5: Calculate AI value
    // ─────────────────────────────────────────────────────────
    const topDriverTotal = topDrivers.reduce((sum, d) => sum + d.dollarAdjustment, 0);
    const supportingTotal = supporting.reduce((sum, d) => sum + d.dollarAdjustment, 0);
    
    let aiValue = lastSold + topDriverTotal + supportingTotal + eyeAppealDollar;

    // ─────────────────────────────────────────────────────────
    // Step 6: Enforce minimum 8% difference from last sold
    // ─────────────────────────────────────────────────────────
    const diffPct = Math.abs((aiValue - lastSold) / lastSold) * 100;
    if (diffPct < 8) {
      const netSignal = topDriverTotal + supportingTotal;
      aiValue = netSignal < 0 ? Math.round(lastSold * 0.92) : Math.round(lastSold * 1.08);
    }

    // ─────────────────────────────────────────────────────────
    // Build response
    // ─────────────────────────────────────────────────────────
    return Response.json({
      top_value_drivers: topDrivers.map(d => ({
        label: d.label,
        dollar_adjustment: fmt(d.dollarAdjustment),
        reason: d.reason || "Market signal"
      })),

      supporting_factors_rollup: {
        net_dollar_adjustment: fmt(supportingTotal),
        description: `Rollup of ${supporting.length} remaining attributes`
      },

      category_impact_summary: {
        card_dna: fmt(categoryImpact.card_dna),
        scarcity_population: fmt(categoryImpact.scarcity_population),
        market_momentum: fmt(categoryImpact.market_momentum),
        player_thesis: fmt(categoryImpact.player_thesis),
        risk_adjustments: fmt(categoryImpact.risk_adjustments)
      },

      valuation_math: {
        last_sold_price: `$${lastSold.toLocaleString('en-US')}`,
        grade_adjustment: `${grade} (already reflects grade)`,
        top_driver_adjustments: fmt(topDriverTotal),
        supporting_factors: fmt(supportingTotal),
        eye_appeal_adjustment: fmt(eyeAppealDollar),
        final_ai_value: `$${aiValue.toLocaleString('en-US')}`
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});