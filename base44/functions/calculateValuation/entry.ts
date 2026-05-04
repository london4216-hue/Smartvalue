import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Grade multipliers relative to raw/ungraded card
// These represent how much MORE (or less) a graded card is worth vs raw comp
const GRADE_MULTIPLIERS = {
  "PSA 10":   2.20,
  "PSA 9":    1.50,
  "PSA 8":    1.20,
  "PSA 7":    1.00,
  "PSA 6":    0.85,
  "PSA 5":    0.70,
  "BGS 10":   3.00,
  "BGS 9.5":  1.80,
  "BGS 9":    1.40,
  "BGS 8.5":  1.15,
  "BGS 8":    1.00,
  "SGC 10":   1.80,
  "SGC 9.5":  1.50,
  "SGC 9":    1.30,
  "SGC 8.5":  1.10,
  "SGC 8":    1.00,
  "CGC 10":   1.60,
  "CGC 9.5":  1.35,
  "CGC 9":    1.20,
  "CGC 8.5":  1.10,
  "Raw":      1.00,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { last_sold_price, grade, attributes } = body;

    if (!last_sold_price || !grade || !Array.isArray(attributes)) {
      return Response.json({
        error: "Missing required fields: last_sold_price, grade, attributes"
      }, { status: 400 });
    }

    const comp = parseFloat(last_sold_price);
    const gradeMultiplier = GRADE_MULTIPLIERS[grade] ?? 1.0;

    // Grade-adjusted base: what the card is worth after grading premium/discount
    // If comp was for the same grade, we use it as-is (multiplier = 1.0 relative)
    // We treat comp as already reflecting the grade, so grade adjustment is 0
    // BUT we show grade multiplier as context info in the breakdown
    const gradeBase = comp; // comp IS the graded price — no further grade adjustment needed
    const gradeDollarDisplay = 0; // no double-counting

    // Parse attribute adjustments into dollar values
    const attributeDrivers = attributes
      .map(attr => {
        // Parse percent from strings like "+12%", "-8%", "12%", "-8"
        const raw = String(attr.percent_adjustment || "0").replace(/[^0-9.\-+]/g, "");
        const percentValue = parseFloat(raw) || 0;
        const dollarAdjustment = Math.round(comp * (percentValue / 100));
        return {
          label: attr.label,
          percent_adjustment: `${percentValue >= 0 ? '+' : ''}${percentValue}%`,
          percentValue,
          dollarAdjustment,
          reason: attr.reason || "Market factor analysis"
        };
      })
      .sort((a, b) => Math.abs(b.dollarAdjustment) - Math.abs(a.dollarAdjustment));

    const top5 = attributeDrivers.slice(0, 5);
    const remaining = attributeDrivers.slice(5);

    const top5Total = top5.reduce((sum, d) => sum + d.dollarAdjustment, 0);
    let supportingTotal = remaining.reduce((sum, d) => sum + d.dollarAdjustment, 0);

    // Ensure supporting factors aren't zero (at least a small positive baseline)
    if (supportingTotal === 0 && remaining.length === 0) {
      supportingTotal = Math.round(comp * 0.03);
    }

    let holdersComp = comp + top5Total + supportingTotal;

    // CRITICAL RULE: AI Value MUST differ from comp by at least 3%
    const diffPct = ((holdersComp - comp) / comp) * 100;
    if (Math.abs(diffPct) < 3) {
      // Force a minimum positive adjustment of 5%
      holdersComp = Math.round(comp * 1.05);
    }

    const difference = holdersComp - comp;
    const differencePercent = ((difference / comp) * 100).toFixed(1);

    const fmt = (n) => {
      const abs = Math.abs(Math.round(n)).toLocaleString('en-US');
      if (n > 0) return `+$${abs}`;
      if (n < 0) return `-$${abs}`;
      return `$0`;
    };

    return Response.json({
      last_sold_price_display: `$${comp.toLocaleString('en-US')}`,
      holders_comp_display: `$${holdersComp.toLocaleString('en-US')}`,
      difference_display: `${parseFloat(differencePercent) >= 0 ? '+' : ''}${differencePercent}%`,

      top_value_drivers: top5.map(d => ({
        label: d.label,
        percent_adjustment: d.percent_adjustment,
        dollar_adjustment: fmt(d.dollarAdjustment),
        reason: d.reason
      })),

      supporting_factors_rollup: {
        total_percent_adjustment: `${((supportingTotal / comp) * 100).toFixed(1)}%`,
        total_dollar_adjustment: fmt(supportingTotal)
      },

      holders_comp_calculation: {
        last_sold_comp: `$${comp.toLocaleString('en-US')}`,
        grade_multiplier_label: `${grade} (×${gradeMultiplier}) — grade is already reflected in your comp`,
        top5_dollar_adjustments: top5.map(d => `${fmt(d.dollarAdjustment)} – ${d.label}`),
        supporting_factors_dollars: fmt(supportingTotal),
        final_holders_comp: `$${holdersComp.toLocaleString('en-US')}`
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});