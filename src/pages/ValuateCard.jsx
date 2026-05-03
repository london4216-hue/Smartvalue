import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import CardInputForm from '@/components/valuation/CardInputForm';
import ValuationResult from '@/components/valuation/ValuationResult';
import { ATTRIBUTE_CATEGORIES, GRADE_WEIGHTS } from '@/components/valuation/AttributeCategories';

function buildPrompt(cardData) {
  const allAttrs = Object.values(ATTRIBUTE_CATEGORIES).flatMap(cat =>
    cat.attributes.map(a => `"${a.key}": (0-100 score for ${a.label}, weight: ${a.weight})`)
  );

  const gradeInfo = cardData.grade && GRADE_WEIGHTS[cardData.grade]
    ? GRADE_WEIGHTS[cardData.grade]
    : null;

  const gradeSection = gradeInfo ? `
GRADE WEIGHT FACTORS (already computed — use these in your valuation math):
- Grade: ${cardData.grade}
- Value Multiplier: ${gradeInfo.multiplier}× (this directly scales the comp baseline)
- Registry Premium: ${gradeInfo.registry_premium > 0 ? `+${(gradeInfo.registry_premium * 100).toFixed(0)}% added to comp` : 'None'}
- Grading Company Market Trust: ${cardData.grade.startsWith('PSA') ? 'Highest (PSA dominates resale market)' : cardData.grade.startsWith('BGS') ? 'Very High (Beckett highly respected, BGS 10 Pristine is rarest)' : cardData.grade.startsWith('SGC') ? 'High (SGC growing rapidly, especially vintage)' : cardData.grade.startsWith('CGC') ? 'Moderate-High (CGC new entrant, growing)' : 'None — raw cards are illiquid, high risk'}
- Centering Tolerance: ${gradeInfo.centering_tolerance}
- Surface Standard: ${gradeInfo.surface_standard}
- Population Scarcity at This Grade: ${(gradeInfo.pop_scarcity_factor * 100).toFixed(0)}/100 (higher = rarer at this grade)
- Upgrade Potential: ${gradeInfo.tier === 'raw' ? 'High — could be worth much more if graded gem' : gradeInfo.tier === 'nm' || gradeInfo.tier === 'low' ? 'Moderate — crossover or resubmit possible' : 'Low — already at top grade'}

When scoring the "grade_quality" category attributes, use these facts directly.
The comp value of ${cardData.comp_value ? '$' + cardData.comp_value : 'unknown'} should be adjusted by the ${gradeInfo.multiplier}× multiplier when estimating AI investment value.
` : '';

  const scanNotes = cardData.scan_notes ? `
CARD SCAN OBSERVATIONS (from AI image analysis):
${cardData.scan_notes}
Use these observations to inform your grade_quality scoring.
` : '';

  return `You are an expert basketball card investment analyst. Analyze the following card and provide a comprehensive investment valuation.

CARD DETAILS:
- Player: ${cardData.player_name}
${cardData.card_year ? `- Year: ${cardData.card_year}` : ''}
${cardData.card_set ? `- Set: ${cardData.card_set}` : ''}
${cardData.card_number ? `- Card Number: ${cardData.card_number}` : ''}
${cardData.variation ? `- Variation: ${cardData.variation}` : ''}
${cardData.grade ? `- Grade: ${cardData.grade}` : ''}
${cardData.comp_value ? `- Last Comparable Sale (raw comp): $${cardData.comp_value}` : '- Last Comparable Sale: Unknown'}
${gradeSection}
${scanNotes}

VALUATION MODEL:
The comp is the market anchor — it represents what buyers are actually paying right now. The AI attributes adjust that anchor up or down based on investment fundamentals.

The final ai_investment_value is calculated as:
  adjusted_value = (comp × grade_multiplier) × (1 + attribute_adjustment)

  Where:
  - comp = the last comparable sale price provided (or your best estimate of real market price)
  - grade_multiplier = ${gradeInfo ? gradeInfo.multiplier : 1.0} (based on grade tier)
  - attribute_adjustment = a value between -0.30 and +0.30, derived from the weighted average of all attribute scores
    → attribute_adjustment = (weighted_avg_score - 50) / 50 × 0.30
    → If weighted avg ≈ 50 (ordinary card), attribute_adjustment ≈ 0 → final ≈ grade-adjusted comp
    → If weighted avg = 80+, attribute_adjustment up to +0.18 → pushes above grade-adjusted comp
    → If weighted avg = 25-, attribute_adjustment down to -0.15 → discounts below grade-adjusted comp
  - NEVER exceed ±30% adjustment from the grade-adjusted comp. The comp IS the market.
  - A card with average attributes should return ai_investment_value ≈ (comp × grade_multiplier). That is correct and intentional.

IMPORTANT: If no comp is provided, use your best knowledge of real recent eBay/PWCC sold prices for this exact card + grade as the comp baseline. Research carefully — the comp is the foundation of everything.

Score each of these ${allAttrs.length} attributes from 0-100 based on your knowledge:

${allAttrs.join('\n')}

Also provide:
- "overall_score": Overall investment score 0-100 (weighted average of all attributes)
- "flip_vs_hold": One of "strong_buy", "buy", "hold", "sell", "strong_sell" — LONG-TERM INVESTMENT perspective only
- "ai_investment_value": Estimated fair investment value in USD using the 4-step model above. MUST be grounded in real market prices.
- "analysis_summary": 3-4 sentence investment thesis. State the comp used, grade multiplier applied, and whether attributes are pushing value above or below market comp.

RETIRED PLAYER HANDLING:
Some attributes only apply to active players. If the player is RETIRED, score the following as "N/A" (use -1 in the JSON, which will display as N/A in the UI):
- current_season_performance → N/A (retired, no current season)
- contract_status → N/A (no contract)
- playoff_team → N/A (no current team)
- trade_volume_30d / trade_volume_90d / price_trend_30d / price_trend_90d → use actual recent card market data, not player performance
- mvp_potential → N/A for clearly retired legends (score their peak legacy instead via hall_of_fame_trajectory)
For all other attributes, score based on career achievement and legacy value, which can be very high for legends.

SPECIAL SCORING NOTES:
- "pop_count_at_grade": Score INVERSELY to population. A pop of 1-5 = score 95-100. Pop 10-25 = 80-90. Pop 50-100 = 60-70. Pop 500+ = 20-30. The rarer the pop, the higher the score.
- "jersey_number_match": If the card number matches the player's jersey number (e.g., card #23 for Michael Jordan), score 90-100. This is a massive collector premium — jersey matches on numbered cards are among the most sought-after in the hobby. If it's a low-numbered match (e.g., /23 numbered AND #23), score 100. If no match, score 0-10.

CRITICAL RULES:
1. The comp is the market's verdict. Respect it. An average card with average attributes should return ai_investment_value ≈ comp. That is NOT a bug — it is the correct answer.
2. Only exceptional fundamentals (rare pop, MVP trajectory, major market trade, viral cultural moment) justify pushing above comp.
3. Only serious red flags (injury, declining performance, oversaturated supply) justify going below comp.
4. Max deviation from grade-adjusted comp is ±30%. Never exceed this.
5. If you're unsure, stay close to the comp. Accuracy over hype.`;
}

function buildResponseSchema() {
  const attrProps = {};
  Object.values(ATTRIBUTE_CATEGORIES).forEach(cat => {
    cat.attributes.forEach(attr => {
      attrProps[attr.key] = { type: "number" };
    });
  });

  return {
    type: "object",
    properties: {
      overall_score: { type: "number" },
      flip_vs_hold: { type: "string" },
      ai_investment_value: { type: "number" },
      analysis_summary: { type: "string" },
      attribute_scores: {
        type: "object",
        properties: attrProps
      }
    }
  };
}

export default function ValuateCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [cardInput, setCardInput] = useState(null);
  const { toast } = useToast();

  const handleValuate = async (cardData) => {
    setIsLoading(true);
    setCardInput(cardData);

    const prompt = buildPrompt(cardData);
    const schema = buildResponseSchema();

    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
      add_context_from_internet: true,
    });

    setResult({
      ...cardData,
      ...aiResult,
    });
    setIsLoading(false);
  };

  const handleSave = async () => {
    await base44.entities.CardValuation.create({
      player_name: result.player_name,
      card_year: result.card_year || '',
      card_set: result.card_set || '',
      card_number: result.card_number || '',
      variation: result.variation || '',
      grade: result.grade || '',
      comp_value: result.comp_value || 0,
      ai_investment_value: result.ai_investment_value || 0,
      overall_score: result.overall_score || 0,
      flip_vs_hold: result.flip_vs_hold || 'hold',
      attribute_scores: result.attribute_scores || {},
      analysis_summary: result.analysis_summary || '',
      in_portfolio: true,
    });

    toast({
      title: "Saved to Portfolio",
      description: `${result.player_name} card has been added to your portfolio.`,
    });
  };

  const handleReset = () => {
    setResult(null);
    setCardInput(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">AI Card Valuation</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Comp = what it sold for. AI Value = what it's <em>worth</em>. 42 forward-looking attributes tell the difference.
        </p>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border/50 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
          <p className="text-sm font-medium text-foreground">Analyzing 42 investment factors...</p>
          <p className="text-xs text-muted-foreground mt-2">
            Pulling player data, market dynamics, cultural impact & more
          </p>
          <div className="flex justify-center gap-1 mt-4">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Result */}
      {result && !isLoading && (
        <ValuationResult
          result={result}
          onSave={handleSave}
          onReset={handleReset}
        />
      )}

      {/* Input Form */}
      {!result && !isLoading && (
        <div className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8">
          <CardInputForm onSubmit={handleValuate} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}