import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { ATTRIBUTE_CATEGORIES } from './AttributeCategories';

function getScoreLabel(score) {
  if (score === -1 || score === null || score === undefined) return 'N/A';
  if (score >= 80) return 'High';
  if (score >= 60) return 'Medium-High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

function AttributeBar({ label, score, weight, delay }) {
  const isNA = score === -1 || score === null || score === undefined;

  const getBarColor = (s) => {
    if (s >= 80) return 'bg-emerald-400';
    if (s >= 60) return 'bg-primary';
    if (s >= 40) return 'bg-amber-400';
    return 'bg-red-400';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground/60">w:{weight}</span>
          <div className="text-right">
            <span className={cn("text-xs font-mono font-semibold block", isNA ? 'text-muted-foreground/40' : 'text-foreground')}>
              {isNA ? 'N/A' : score}
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              {getScoreLabel(score)}
            </span>
          </div>
        </div>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        {!isNA && (
          <motion.div
            className={cn("h-full rounded-full", getBarColor(score))}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, delay: delay * 0.02, ease: "easeOut" }}
          />
        )}
      </div>
    </div>
  );
}

function CategorySection({ categoryKey, categoryDef, scores, startDelay }) {
  const [open, setOpen] = useState(true);

  const catScores = categoryDef.attributes
    .map(attr => scores[attr.key])
    .filter(s => s !== undefined && s !== null && s !== -1);
  const avgScore = catScores.length > 0
    ? Math.round(catScores.reduce((a, b) => a + b, 0) / catScores.length)
    : 0;

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
        <div className="flex items-center gap-3">
          <span className={cn("text-sm font-mono font-bold", getAvgColor(avgScore))}>
            {avgScore}
          </span>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30">
          <div className="pt-3" />
          {categoryDef.attributes.map((attr, i) => (
            <AttributeBar
              key={attr.key}
              label={attr.label}
              score={scores[attr.key] ?? 0}
              weight={attr.weight}
              delay={startDelay + i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AttributeBreakdown({ scores }) {
  let runningDelay = 0;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
        Full Attribute Breakdown ({Object.values(ATTRIBUTE_CATEGORIES).reduce((s, c) => s + c.attributes.length, 0)} Factors)
      </h3>
      {Object.entries(ATTRIBUTE_CATEGORIES).map(([key, catDef]) => {
        const currentDelay = runningDelay;
        runningDelay += catDef.attributes.length;
        return (
          <CategorySection
            key={key}
            categoryKey={key}
            categoryDef={catDef}
            scores={scores}
            startDelay={currentDelay}
          />
        );
      })}
    </div>
  );
}