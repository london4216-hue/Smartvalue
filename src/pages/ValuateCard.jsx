import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import CardInputForm from '@/components/valuation/CardInputForm';
import ValuationResult from '@/components/valuation/ValuationResult';
import { ATTRIBUTE_CATEGORIES, GRADE_WEIGHTS } from '@/components/valuation/AttributeCategories';

function buildPrompt(cardData) {
  const allAttrs = Object.values(ATTRIBUTE_CATEGORIES).flatMap(cat =>
    cat.attributes.map(a => `"${a.key}": (0-100 score — ${a.label}. Context: ${a.note || ''} Weight: ${a.weight})`)
  );

  const gradeInfo = cardData.grade && GRADE_WEIGHTS[cardData.grade]
    ? GRADE_WEIGHTS[cardData.grade]
    : null;

  const gradeSection = gradeInfo ? `
GRADE FACTORS:
- Grade: ${cardData.grade}
- Value Multiplier: ${gradeInfo.multiplier}×
- Registry Premium: ${gradeInfo.registry_premium > 0 ? `+${(gradeInfo.registry_premium * 100).toFixed(0)}%` : 'None'}
- Grading Company Trust: ${cardData.grade.startsWith('PSA') ? 'Highest (PSA dominates resale)' : cardData.grade.startsWith('BGS') ? 'Very High (BGS 10 Pristine is rarest slab)' : cardData.grade.startsWith('SGC') ? 'High (SGC growing fast, especially vintage)' : cardData.grade.startsWith('CGC') ? 'Moderate-High (CGC emerging)' : 'None — raw = illiquid, high risk'}
- Pop Scarcity at This Grade: ${(gradeInfo.pop_scarcity_factor * 100).toFixed(0)}/100
- Upgrade Potential: ${gradeInfo.tier === 'raw' ? 'High' : gradeInfo.tier === 'nm' || gradeInfo.tier === 'low' ? 'Moderate' : 'Low — already at top grade'}
` : '';

  const scanNotes = cardData.scan_notes ? `
CARD SCAN OBSERVATIONS:
${cardData.scan_notes}
` : '';

  return `You are an expert basketball card investment analyst running a PREDICTIVE INDEX — not a grading report. Every score should answer: "Does this signal make the card worth more in the future?"

CARD DETAILS:
- Player: ${cardData.player_name}
${cardData.card_year ? `- Year: ${cardData.card_year}` : ''}
${cardData.card_set ? `- Set: ${cardData.card_set}` : ''}
${cardData.card_number ? `- Card Number: ${cardData.card_number}` : ''}
${cardData.variation ? `- Variation: ${cardData.variation}` : ''}
${cardData.grade ? `- Grade: ${cardData.grade}` : ''}
${cardData.comp_value ? `- Last Comparable Sale (raw comp): $${cardData.comp_value}` : '- Last Comparable Sale: Unknown — research real eBay/PWCC sold prices'}
${cardData.cheapest_available ? `- Cheapest Available Now (lowest current ask/BIN): $${cardData.cheapest_available} — IMPORTANT: if this is lower than the comp, it directly suppresses real market value. The AI value cannot meaningfully exceed the cheapest replacement cost unless the supply is extremely limited.` : ''}
${gradeSection}
${scanNotes}

CARD DNA SCORING RULES (score these based on what you know about the card):
- "card_brand_tier": National Treasures/Flawless/Exquisite = 90-100. Prizm/Select/Optic = 60-80. Base Topps/Donruss = 20-40.
- "set_prestige": Iconic sets (1986 Fleer, 96-97 Topps Chrome, 03-04 Exquisite) = 95-100. Modern premium = 70-85. Base modern = 30-50.
- "variation_desirability": Prizm Silver/Base = 60-70. Gold/Color parallels = 75-85. Low-numbered (/10 or less) = 90-100. Superfractor = 100.
- "card_number_significance": If card number = player jersey number, score 85-100. Otherwise score 10-20.
- "jersey_number_match": If card# matches player jersey# exactly (e.g. #23 for Jordan), score 90-100. If /23 numbered AND card #23, score 100. No match = 0-10.

SERIAL NUMBER & PRINT RUN RULES:
- "is_serialized": Card is numbered = 80-100. Unnumbered = 0-20.
- "print_run_size": /1 = 100. /5 = 95. /10 = 90. /25 = 82. /49 = 75. /99 = 65. /149 = 55. /199 = 48. /249 = 40. /499+ = 25. Unnumbered = 10.
- "bookend_number": Is serial #1 of run OR #max of run (e.g. 25/25)? Yes = 90-100. Not applicable = 0.
- "low_serial_number": Serial #1 = 100. #2 = 95. #3-5 = 88. #6-10 = 78. #11-25 = 60. #26+ = 20. Not applicable = 0.
- "is_one_of_one": True 1/1 (plate, superfractor, logoman, hand-numbered) = 100. Not a 1/1 = 0.

AUTOGRAPH RULES:
- "has_autograph": Card has a certified auto = 85-100. No auto = 0-10.
- "auto_type": On-card auto (signed directly on card) = 85-100. Sticker auto = 30-55. No auto = 0.
- "auto_quality": Bold full-name signature = 80-100. Partial/rushed = 40-65. Sticker scribble = 20-40.
- "auto_graded": BGS 10 auto sub = 95. BGS 9.5 = 80. JSA/PSA auth = 60. Not graded = 30. No auto = 0.
- "dual_triple_auto": Triple auto = 90-100. Dual = 75-85. Single only = 0-10.

PATCH RULES:
- "has_patch": Card has embedded patch/swatch = 80-100. No patch = 0.
- "patch_quality": Logoman patch = 100. Nike Swoosh/Brand logo = 88. Number patch = 82. Multi-color = 70. Single white = 40. No patch = 0.
- "rpa_designation": True RPA (RC + Patch + Auto) = 95-100. Has 2 of 3 = 60-70. Base card = 0.

POPULATION SCORING (INVERSE — lower pop = higher score):
- "pop_count_at_grade": Pop 1 = 100. Pop 2-5 = 92-96. Pop 6-15 = 82-88. Pop 16-30 = 72-78. Pop 31-75 = 60-68. Pop 76-150 = 45-55. Pop 151-300 = 30-42. Pop 301-500 = 18-28. Pop 500+ = 5-15.
- "pop_report": Total graded count. Under 50 total = 90-100. Under 200 = 75-85. Under 500 = 60-70. 500-2000 = 40-55. 2000+ = 20-35. 10000+ = 5-15.

RETIRED PLAYER HANDLING:
If player is retired, score these as -1 (N/A): career_trajectory (if fully retired), injury_risk.
For retired legends, goat_legacy_score, hall_of_fame_trajectory, cultural_icon_status, and historical_appreciation should all be very high (80-100).

CHEAPEST AVAILABLE RULE:
If cheapest_available is provided and is LOWER than the grade-adjusted comp:
- This is a hard ceiling signal. A buyer can get the same card cheaper right now.
- Adjust ai_investment_value DOWN toward cheapest_available unless pop is extremely low (under 10 at grade).
- Mention this in analysis_summary — it's one of the most important real-world signals.

  VALUATION MODEL:
  ai_investment_value = (comp × grade_multiplier) × (1 + attribute_adjustment)
  - grade_multiplier = ${gradeInfo ? gradeInfo.multiplier : 1.0}
  - attribute_adjustment = (weighted_avg_score - 50) / 50 × 0.30 (capped at ±30%)
  - A card with average attributes should return ≈ grade-adjusted comp. That is correct.
  - Max deviation: ±30% from grade-adjusted comp.

Score ALL ${allAttrs.length} attributes (0-100, or -1 for N/A):

${allAttrs.join('\n')}

Return:
- "overall_score": 0-100 weighted investment score
- "flip_vs_hold": "strong_buy" | "buy" | "hold" | "sell" | "strong_sell" (long-term perspective)
- "ai_investment_value": USD value using the model above, grounded in real market data
- "analysis_summary": 3-4 sentence thesis. Lead with the card's key investment signals (auto type, print run, patch quality, player trajectory). State comp used and what's driving the AI value up or down.`;
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
      cheapest_available: result.cheapest_available || null,
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
          Comp = what it sold for. AI Value = what it's <em>worth</em>. Serial number, auto type, patch quality, pop report, player thesis — every signal that moves the needle.
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
          <p className="text-sm font-medium text-foreground">Running predictive investment index...</p>
          <p className="text-xs text-muted-foreground mt-2">
            Scoring card DNA, serial number, auto type, patch quality, pop data & market signals
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