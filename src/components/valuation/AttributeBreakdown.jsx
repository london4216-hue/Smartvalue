import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
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
 * Shows how each attribute adds or subtracts from the base AI investment value
 */
export default function AttributeBreakdown({ scores, baseValue = 10000 }) {
  let runningDelay = 0;

  const totalAttributeImpact = Object.entries(ATTRIBUTE_CATEGORIES).reduce((sum, [_, catDef]) => {
    return sum + catDef.attributes.reduce((catSum, attr) => {
      const score = scores[attr.key];
      const impact = calculateAttributeImpact(score, baseValue, attr.weight);
      return catSum + impact;
    }, 0);
  }, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
        Valuation Ledger ({Object.values(ATTRIBUTE_CATEGORIES).reduce((s, c) => s + c.attributes.length, 0)} Factors)
      </h3>

      {/* Ledger Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4"
      >
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-primary/70 mb-1">Base Value</p>
          <p className="text-xl font-mono font-bold text-primary">
            ${baseValue.toLocaleString()}
          </p>
        </div>
        <div className={cn(
          "rounded-lg p-3 border",
          totalAttributeImpact >= 0
            ? 'bg-emerald-400/5 border-emerald-400/20'
            : 'bg-red-400/5 border-red-400/20'
        )}>
          <p className={cn(
            "text-[10px] font-mono uppercase tracking-wider mb-1",
            totalAttributeImpact >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'
          )}>
            Total Attribute Impact
          </p>
          <p className={cn(
            "text-xl font-mono font-bold",
            totalAttributeImpact >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}>
            {totalAttributeImpact >= 0 ? '+' : ''}{(totalAttributeImpact / 1000).toFixed(1)}K ({((totalAttributeImpact / baseValue) * 100).toFixed(1)}%)
          </p>
        </div>
      </motion.div>

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
          <span className="font-semibold">How it works:</span> Each attribute is scored 0-100. Scores above 50 increase value (green), scores below 50 decrease value (red). Impact is weighted by importance.
        </p>
      </motion.div>
    </div>
  );
}
