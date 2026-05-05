import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronDown, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { ATTRIBUTE_CATEGORIES } from './AttributeCategories';

function getScoreLabel(score) {
  if (score === -1 || score === null || score === undefined) return 'N/A';
  if (score >= 80) return 'High';
  if (score >= 60) return 'Medium-High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

/**
 * Calculate the impact of an attribute on the base value
 * Score ranges 0-100, converted to percentage impact
 */
function calculateAttributeImpact(score, baseValue, weight = 1) {
  if (score === -1 || score === null || score === undefined) return 0;

  // Normalize score to -50% to +50% range
  const normalizedScore = (score - 50) / 100; // -0.5 to 0.5
  const impactPercentage = normalizedScore * weight;
  const impact = Math.round(baseValue * impactPercentage);

  return impact;
}

function AttributeLedgerRow({ label, score, weight, baseValue, delay, isSubtle }) {
  const isNA = score === -1 || score === null || score === undefined;
  const impact = isNA ? 0 : calculateAttributeImpact(score, baseValue, weight);
  const isPositive = impact >= 0;

  const getBarColor = (s) => {
    if (s >= 80) return 'bg-emerald-400';
    if (s >= 60) return 'bg-primary';
    if (s >= 40) return 'bg-amber-400';
    return 'bg-red-400';
  };

  const getImpactColor = (positive) => {
    return positive ? 'text-emerald-400' : 'text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay * 0.03, duration: 0.3 }}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border",
        isSubtle ? 'bg-secondary/30 border-border/30' : 'bg-secondary/50 border-border/50 hover:bg-secondary/70 transition-colors'
      )}
    >
      {/* Left: Label & Score Bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className={cn(
            "text-xs font-medium truncate",
            isSubtle ? 'text-muted-foreground/70' : 'text-foreground'
          )}>
            {label}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] font-mono text-muted-foreground/60">w:{weight}</span>
            {!isNA && (
              <div className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold", getBarColor(score))}>
                {score}
              </div>
            )}
          </div>
        </div>
        {/* Mini bar */}
        {!isNA && (
          <div className="h-0.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full", getBarColor(score))}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.6, delay: delay * 0.03 + 0.1, ease: "easeOut" }}
            />
          </div>
        )}
      </div>

      {/* Right: Impact */}
      <div className={cn("flex items-center gap-1.5 font-mono text-right flex-shrink-0 ml-3", getImpactColor(isPositive))}>
        {!isNA && (
          <>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="text-xs font-bold">
              {isPositive ? '+' : ''}{(impact / 1000).toFixed(1)}K
            </span>
          </>
        )}
        {isNA && (
          <span className="text-[10px] text-muted-foreground/40">N/A</span>
        )}
      </div>
    </motion.div>
  );
}

function CategorySection({ categoryKey, categoryDef, scores, baseValue, startDelay }) {
  const [open, setOpen] = useState(true);

  // Calculate category totals
  const catScores = categoryDef.attributes
    .map(attr => ({ score: scores[attr.key], weight: attr.weight }))
    .filter(s => s.score !== undefined && s.score !== null && s.score !== -1);

  const avgScore = catScores.length > 0
    ? Math.round(catScores.reduce((a, b) => a + b.score, 0) / catScores.length)
    : 0;

  const categoryTotalImpact = categoryDef.attributes.reduce((sum, attr) => {
    const score = scores[attr.key];
    const impact = calculateAttributeImpact(score, baseValue, attr.weight);
    return sum + impact;
  }, 0);

  const getAvgColor = (s) => {
    if (s >= 80) return 'text-emerald-400';
    if (s >= 60) return 'text-primary';
    if (s >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">{categoryDef.label}</span>
          <span className="text-xs font-mono text-muted-foreground">
            {categoryDef.attributes.length} factors
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={cn("text-sm font-mono font-bold", getAvgColor(avgScore))}>
              {avgScore}
            </div>
            <div className={cn(
              "text-xs font-mono",
              categoryTotalImpact >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              {categoryTotalImpact >= 0 ? '+' : ''}{(categoryTotalImpact / 1000).toFixed(1)}K
            </div>
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0",
            open && "rotate-180"
          )} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-border/30">
          <div className="pt-3" />
          {categoryDef.attributes.map((attr, i) => (
            <AttributeLedgerRow
              key={attr.key}
              label={attr.label}
              score={scores[attr.key] ?? 0}
              weight={attr.weight}
              baseValue={baseValue}
              delay={startDelay + i}
              isSubtle={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * AttributeBreakdown - Displays attributes as a ledger showing impact on valuation
 * Shows how each attribute adds or subtracts from the comp price baseline
 */
export default function AttributeBreakdown({ scores, baseValue = 10000 }) {
  let runningDelay = 0;

  // Validate baseValue
  if (!baseValue || baseValue <= 0) {
    return (
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Cannot calculate attribute impact</p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
            No valid comp price available. Ensure card has recent comparable sales.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
        Why This Price? All the Factors ({Object.values(ATTRIBUTE_CATEGORIES).reduce((s, c) => s + c.attributes.length, 0)} signals checked)
      </h3>



      {/* Category Sections */}
      <div className="space-y-3">
        {Object.entries(ATTRIBUTE_CATEGORIES).map(([key, catDef]) => {
          const currentDelay = runningDelay;
          runningDelay += catDef.attributes.length;
          return (
            <CategorySection
              key={key}
              categoryKey={key}
              categoryDef={catDef}
              scores={scores}
              baseValue={baseValue}
              startDelay={currentDelay}
            />
          );
        })}
      </div>

      {/* Footer Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-accent/30 border border-border/30 rounded-lg p-3 mt-4"
      >
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          <span className="font-semibold">How to read this:</span> Green scores (60+) are strengths that add value. Red scores (below 40) are weaknesses that subtract value. Click each category to expand and see all factors. The higher the score in each category, the more that factor helps justify a higher price.
        </p>
      </motion.div>
    </div>
  );
}