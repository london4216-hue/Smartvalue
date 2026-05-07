import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronRight, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Takes a batch of attributes and scores them via LLM, returns adjustments + new AI value
async function scoreNextAttributes(cardData, attributeBatch, currentAiValue) {
  const attrList = attributeBatch.map(a => `"${a.key || a.label}": (${a.label}, current direction hint: ${a.direction})`).join('\n');

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are scoring additional card attributes for a sports card valuation.

CARD: ${cardData.player_name} ${cardData.card_year || ''} ${cardData.card_set || ''} ${cardData.variation || ''} ${cardData.grade || ''}
CURRENT AI VALUE: $${currentAiValue}
LAST SOLD COMP: $${cardData.comp_value || 0}

Score ONLY these ${attributeBatch.length} attributes (0-100, or -1 if N/A):
${attrList}

For each attribute, provide:
- score (0-100 or -1)
- percent_adjustment (e.g. "+3%" or "-2%" — SMALL adjustments, max ±8% per attribute, most will be ±1-4%)
- dollar_adjustment (e.g. "+$12" or "-$8")
- reason (1 sentence)

Then compute new_ai_value = current AI value after applying all adjustments. Keep changes modest — these are secondary attributes, not primary value drivers.

Return JSON only.`,
    response_json_schema: {
      type: "object",
      properties: {
        scored_attributes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label:              { type: "string" },
              score:              { type: "number" },
              percent_adjustment: { type: "string" },
              dollar_adjustment:  { type: "string" },
              direction:          { type: "string" },
              reason:             { type: "string" },
            }
          }
        },
        new_ai_value: { type: "number" },
        net_change_summary: { type: "string" },
      }
    },
    model: 'gemini_3_flash',
  });

  return result;
}

const DIRECTION_STYLES = {
  bullish:  { color: 'text-emerald-500', bg: 'bg-emerald-500/8 border-emerald-500/25', icon: TrendingUp,   arrow: '↑' },
  bearish:  { color: 'text-red-400',     bg: 'bg-red-500/8 border-red-500/25',         icon: TrendingDown, arrow: '↓' },
  neutral:  { color: 'text-muted-foreground', bg: 'bg-secondary border-border/30',     icon: Minus,        arrow: '·' },
};

function ScoredAttributeRow({ attr, index }) {
  const dir = DIRECTION_STYLES[attr.direction] || DIRECTION_STYLES.neutral;
  const isPositive = attr.percent_adjustment?.startsWith('+');
  const isNegative = attr.percent_adjustment?.startsWith('-');

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex items-start gap-3 py-2.5 border-b border-border/20 last:border-0"
    >
      <span className={cn("text-sm font-bold shrink-0 mt-0.5", dir.color)}>{dir.arrow}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{attr.label}</p>
          {attr.dollar_adjustment && (
            <span className={cn(
              "text-xs font-mono font-bold shrink-0",
              isPositive && "text-emerald-500",
              isNegative && "text-red-400",
              !isPositive && !isNegative && "text-muted-foreground",
            )}>
              {attr.dollar_adjustment} ({attr.percent_adjustment})
            </span>
          )}
        </div>
        {attr.reason && (
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{attr.reason}</p>
        )}
      </div>
    </motion.div>
  );
}

export default function DeepDiveAttributes({ result, onNewAiValue }) {
  // remaining = attributes not yet scored, split into batches of 5
  const [remainingAttrs, setRemainingAttrs] = useState(result.other_attributes || []);
  const [rounds, setRounds] = useState([]); // [{attrs, new_ai_value, net_change_summary}]
  const [currentAiValue, setCurrentAiValue] = useState(result.ai_investment_value || 0);
  const [loading, setLoading] = useState(false);

  const hasMore = remainingAttrs.length > 0;
  const nextBatch = remainingAttrs.slice(0, 5);

  const handleRunNext = async () => {
    if (!hasMore || loading) return;
    setLoading(true);

    const batch = nextBatch;
    const scored = await scoreNextAttributes(result, batch, currentAiValue);

    const newValue = scored.new_ai_value || currentAiValue;
    const roundData = {
      attrs: scored.scored_attributes || batch.map(a => ({ label: a.label, direction: a.direction })),
      new_ai_value: newValue,
      net_change_summary: scored.net_change_summary || '',
      prev_ai_value: currentAiValue,
    };

    setRounds(prev => [...prev, roundData]);
    setCurrentAiValue(newValue);
    setRemainingAttrs(prev => prev.slice(5));
    if (onNewAiValue) onNewAiValue(newValue);
    setLoading(false);
  };

  if (!result.other_attributes?.length) return null;

  const totalRounds = Math.ceil((result.other_attributes?.length || 0) / 5);
  const completedRounds = rounds.length;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/30 bg-secondary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Deep Dive — Additional Attributes
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Score the next 5 attributes to refine your AI value. Small adjustments — these are secondary signals.
            </p>
          </div>
          {completedRounds > 0 && (
            <div className="text-right shrink-0">
              <p className="text-[10px] text-muted-foreground font-mono">Refined AI Value</p>
              <p className="text-lg font-mono font-bold text-primary">${currentAiValue.toLocaleString()}</p>
              <p className={cn(
                "text-[10px] font-mono font-semibold",
                currentAiValue > result.ai_investment_value ? "text-emerald-500" : currentAiValue < result.ai_investment_value ? "text-red-400" : "text-muted-foreground"
              )}>
                {currentAiValue > result.ai_investment_value ? '+' : ''}{(currentAiValue - result.ai_investment_value).toLocaleString()} vs base
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Completed rounds */}
        <AnimatePresence>
          {rounds.map((round, roundIdx) => {
            const delta = round.new_ai_value - round.prev_ai_value;
            const isUp = delta > 0;
            const isDown = delta < 0;

            return (
              <motion.div
                key={roundIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-border/30 rounded-xl overflow-hidden"
              >
                {/* Round header */}
                <div className={cn(
                  "flex items-center justify-between px-4 py-2.5 border-b border-border/20",
                  isUp ? "bg-emerald-500/5" : isDown ? "bg-red-500/5" : "bg-secondary/30"
                )}>
                  <p className="text-xs font-bold text-foreground">
                    Round {roundIdx + 1} — {round.attrs.length} attributes scored
                  </p>
                  <div className="flex items-center gap-2">
                    {delta !== 0 && (
                      <span className={cn(
                        "text-xs font-mono font-bold px-2 py-0.5 rounded-full border",
                        isUp  ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" : "text-red-400 bg-red-500/10 border-red-500/30"
                      )}>
                        {isUp ? '+' : ''}{delta > 0 ? Math.round(delta) : Math.round(delta)} → ${round.new_ai_value.toLocaleString()}
                      </span>
                    )}
                    {delta === 0 && (
                      <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded-full border border-border/30">
                        No change → ${round.new_ai_value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Attributes */}
                <div className="px-4 divide-y divide-border/10">
                  {round.attrs.map((attr, i) => (
                    <ScoredAttributeRow key={i} attr={attr} index={i} />
                  ))}
                </div>

                {/* Net change summary */}
                {round.net_change_summary && (
                  <div className="px-4 py-2.5 bg-secondary/20 border-t border-border/20">
                    <p className="text-[10px] text-muted-foreground italic">{round.net_change_summary}</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Next batch preview */}
        {hasMore && (
          <div className="border border-dashed border-primary/30 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-primary/60 mb-2">
              Next {nextBatch.length} attributes to score
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {nextBatch.map((attr, i) => {
                const dir = DIRECTION_STYLES[attr.direction] || DIRECTION_STYLES.neutral;
                return (
                  <span key={i} className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium border",
                    dir.bg, dir.color
                  )}>
                    {dir.arrow} {attr.label}
                  </span>
                );
              })}
            </div>

            <Button
              onClick={handleRunNext}
              disabled={loading}
              className="w-full h-11 rounded-xl text-sm font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scoring attributes...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run Next {nextBatch.length} Attributes
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>

            {remainingAttrs.length > 5 && (
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                {remainingAttrs.length - 5} more attribute{remainingAttrs.length - 5 !== 1 ? 's' : ''} after this batch
              </p>
            )}
          </div>
        )}

        {/* All done */}
        {!hasMore && rounds.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4 border border-dashed border-border/30 rounded-xl"
          >
            <p className="text-sm font-bold text-foreground mb-1">✅ All attributes scored</p>
            <p className="text-xs text-muted-foreground">
              Final refined AI value: <span className="font-mono font-bold text-primary">${currentAiValue.toLocaleString()}</span>
            </p>
            {currentAiValue !== result.ai_investment_value && (
              <p className={cn(
                "text-xs font-mono font-semibold mt-1",
                currentAiValue > result.ai_investment_value ? "text-emerald-500" : "text-red-400"
              )}>
                {currentAiValue > result.ai_investment_value ? '+' : ''}${Math.round(currentAiValue - result.ai_investment_value)} from deep dive analysis
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}