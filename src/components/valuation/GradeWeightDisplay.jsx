import { cn } from '@/lib/utils';
import { GRADE_WEIGHTS, GRADE_TIER_LABELS } from './AttributeCategories';
import { Shield } from 'lucide-react';

export default function GradeWeightDisplay({ grade }) {
  if (!grade || !GRADE_WEIGHTS[grade]) return null;

  const g = GRADE_WEIGHTS[grade];
  const tier = GRADE_TIER_LABELS[g.tier];
  const mult = g.multiplier;
  const isPositive = mult >= 1.0;
  const pct = ((mult - 1) * 100).toFixed(0);

  return (
    <div className="bg-secondary/30 border border-border/40 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Grade Weight Factors
          </span>
        </div>
        <span className={cn(
          "text-xs font-mono font-bold",
          tier?.color || "text-foreground"
        )}>
          {tier?.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground">Value Multiplier</span>
          <span className={cn(
            "text-[10px] font-mono font-bold",
            isPositive ? "text-emerald-400" : "text-amber-400"
          )}>
            {mult}× {isPositive && pct !== '0' ? `(+${pct}%)` : pct !== '0' ? `(${pct}%)` : '(baseline)'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground">Registry Premium</span>
          <span className={cn(
            "text-[10px] font-mono font-semibold",
            g.registry_premium > 0 ? "text-emerald-400" : "text-muted-foreground"
          )}>
            {g.registry_premium > 0 ? `+${(g.registry_premium * 100).toFixed(0)}%` : 'None'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground">Centering</span>
          <span className="text-[10px] font-mono text-foreground/70">{g.centering_tolerance}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground">Pop Scarcity</span>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-12 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${g.pop_scarcity_factor * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {(g.pop_scarcity_factor * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/60 font-mono">{g.surface_standard}</p>
    </div>
  );
}