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
  Step 1: Apply grade multiplier → adjusted_comp = comp × ${gradeInfo ? gradeInfo.multiplier : 1.0}
  Step 2: Add registry premium → registry_adjusted = adjusted_comp × (1 + ${gradeInfo ? gradeInfo.registry_premium : 0})
  Step 3: Calculate AI attribute modifier → attribute_modifier = (overall_attribute_score - 50) / 50 (ranges from -1.0 to +1.0)
  Step 4: Apply modifier to comp → final = registry_adjusted × (1 + (attribute_modifier × 0.40))
  
  This means:
  - The comp + grade adjustment anchors 100% of the base value
  - Strong attributes (score 80+) can push value up to +24% above grade-adjusted comp
  - Weak attributes (score 20-) can discount value up to -24% below grade-adjusted comp
  - The AI NEVER fabricates a value wildly disconnected from what the market is actually paying

IMPORTANT: If no comp is provided, use your best knowledge of real recent eBay/PWCC sold prices for this exact card + grade as the comp baseline. Do NOT make up a comp — research it carefully.

Score each of these ${allAttrs.length} attributes from 0-100 based on your knowledge:

${allAttrs.join('\n')}

Also provide:
- "overall_score": Overall investment score 0-100 (weighted average of all attributes)
- "flip_vs_hold": One of "strong_buy", "buy", "hold", "sell", "strong_sell" — LONG-TERM INVESTMENT perspective only
- "ai_investment_value": Estimated fair investment value in USD using the 4-step model above. MUST be grounded in real market prices.
- "analysis_summary": 3-4 sentence investment thesis. State the comp used, grade multiplier applied, and whether attributes are pushing value above or below market comp.

CRITICAL: The comp is king. A PSA 10 Luka Prizm that last sold for $400 should NOT come back at $4,000 just because attributes are high. Attributes can adjust ±24% max. Be conservative and accurate. Real investors trust data, not hype.`;
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