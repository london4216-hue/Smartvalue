Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { last_sold_price, grade, attributes } = body;

    if (!last_sold_price || !grade || !Array.isArray(attributes)) {
      return Response.json({
        error: "Missing required fields: last_sold_price, grade, attributes"
      }, { status: 400 });
    }

    // Grade multiplier lookup
    const GRADE_MULTIPLIERS = {
      "PSA 10": 1.00,
      "BGS 9.5": 0.90,
      "BGS 9": 0.80,
      "BGS 8.5": 0.65,
      "PSA 8": 0.60
    };

    const gradeMultiplier = GRADE_MULTIPLIERS[grade] || 0.70;
    const gradeDollarAdjustment = -Math.round(last_sold_price * (1 - gradeMultiplier));

    // Convert attributes to dollar adjustments and sort
    let attributeDrivers = attributes.map(attr => {
      const percentMatch = attr.percent_adjustment.match(/([+-]?\d+(?:\.\d+)?)/);
      const percentValue = percentMatch ? parseFloat(percentMatch[1]) : 0;
      const dollarAdjustment = Math.round(last_sold_price * (percentValue / 100));

      return {
        label: attr.label,
        percent_adjustment: attr.percent_adjustment,
        percentValue,
        dollarAdjustment,
        reason: attr.reason || "Market factor analysis"
      };
    }).sort((a, b) => Math.abs(b.dollarAdjustment) - Math.abs(a.dollarAdjustment));

    // Top 5 drivers and supporting factors
    const top5 = attributeDrivers.slice(0, 5);
    const remaining = attributeDrivers.slice(5);

    // Supporting factors rollup
    let supportingFactorsDollars = remaining.reduce((sum, d) => sum + d.dollarAdjustment, 0);
    if (remaining.length === 0) {
      supportingFactorsDollars = Math.round(last_sold_price * 0.05);
    }

    // Calculate Holder's Comp
    let holdersComp = last_sold_price + gradeDollarAdjustment + 
      top5.reduce((sum, d) => sum + d.dollarAdjustment, 0) + 
      supportingFactorsDollars;

    // CRITICAL: If holders_comp equals last_sold_price, force adjustment
    if (holdersComp === last_sold_price) {
      supportingFactorsDollars = Math.round(last_sold_price * 0.12);
      holdersComp = last_sold_price + gradeDollarAdjustment + 
        top5.reduce((sum, d) => sum + d.dollarAdjustment, 0) + 
        supportingFactorsDollars;
    }

    // Calculate supporting factors percent
    const supportingFactorsPercent = ((supportingFactorsDollars / last_sold_price) * 100).toFixed(1);

    // Calculate difference
    const difference = holdersComp - last_sold_price;
    const differencePercent = ((difference / last_sold_price) * 100).toFixed(1);

    return Response.json({
      last_sold_price_display: `$${last_sold_price.toLocaleString()}`,
      holders_comp_display: `$${holdersComp.toLocaleString()}`,
      difference_display: `${differencePercent >= 0 ? '+' : ''}${differencePercent}%`,
      
      top_value_drivers: top5.map(d => ({
        label: d.label,
        percent_adjustment: d.percent_adjustment,
        dollar_adjustment: `${d.dollarAdjustment >= 0 ? '+' : ''}$${Math.abs(d.dollarAdjustment).toLocaleString()}`,
        reason: d.reason
      })),

      supporting_factors_rollup: {
        total_percent_adjustment: `${supportingFactorsPercent >= 0 ? '+' : ''}${supportingFactorsPercent}%`,
        total_dollar_adjustment: `${supportingFactorsDollars >= 0 ? '+' : ''}$${Math.abs(supportingFactorsDollars).toLocaleString()}`
      },

      holders_comp_calculation: {
        last_sold_price: `$${last_sold_price.toLocaleString()}`,
        grade_multiplier_dollars: `$${gradeDollarAdjustment.toLocaleString()}`,
        top5_dollar_adjustments: top5.map(d => `${d.dollarAdjustment >= 0 ? '+' : ''}$${Math.abs(d.dollarAdjustment).toLocaleString()}`),
        supporting_factors_dollars: `${supportingFactorsDollars >= 0 ? '+' : ''}$${Math.abs(supportingFactorsDollars).toLocaleString()}`,
        final_holders_comp: `$${holdersComp.toLocaleString()}`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});