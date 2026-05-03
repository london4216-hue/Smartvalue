import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import CardInputForm from '@/components/valuation/CardInputForm';
import ValuationResult from '@/components/valuation/ValuationResult';
import { ATTRIBUTE_CATEGORIES } from '@/components/valuation/AttributeCategories';

function buildPrompt(cardData) {
  const allAttrs = Object.values(ATTRIBUTE_CATEGORIES).flatMap(cat =>
    cat.attributes.map(a => `"${a.key}": (0-100 score for ${a.label}, weight: ${a.weight})`)
  );

  return `You are an expert basketball card investment analyst. Analyze the following card and provide a comprehensive investment valuation.

CARD DETAILS:
- Player: ${cardData.player_name}
${cardData.card_year ? `- Year: ${cardData.card_year}` : ''}
${cardData.card_set ? `- Set: ${cardData.card_set}` : ''}
${cardData.card_number ? `- Card Number: ${cardData.card_number}` : ''}
${cardData.variation ? `- Variation: ${cardData.variation}` : ''}
${cardData.grade ? `- Grade: ${cardData.grade}` : ''}
${cardData.comp_value ? `- Last Comparable Sale: $${cardData.comp_value}` : '- Last Comparable Sale: Unknown'}

VALUATION MODEL:
The final investment value is calculated as:
- 50% weight: Comp baseline (last comparable sale)
- 50% weight: AI Attribute Score (the multi-factor analysis below)

Score each of these ${allAttrs.length} attributes from 0-100 based on your knowledge:

${allAttrs.join('\n')}

Also provide:
- "overall_score": An overall investment score from 0-100
- "flip_vs_hold": One of "strong_buy", "buy", "hold", "sell", "strong_sell" — from a LONG-TERM INVESTMENT perspective (NOT a flipper perspective)
- "ai_investment_value": Your estimated fair market investment value in USD (considering all factors, not just last sale)
- "analysis_summary": A 2-3 sentence investment thesis explaining your valuation

IMPORTANT: Think about long-term investment value, not short-term flip value. Consider player trajectory, cultural impact, scarcity, and market dynamics. The comp is just a starting point — the real value comes from the multi-factor analysis.`;
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
          Go beyond comps. 42 attributes analyzed for true investment value.
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