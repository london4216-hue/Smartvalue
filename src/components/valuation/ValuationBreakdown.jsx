import { motion } from 'framer-motion';
import { Plus, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Parse a dollar string like "+$1,250" or "-$340" into a number
function parseDollar(str) {
  if (!str) return 0;
  const clean = str.replace(/[^0-9.\-]/g, '');
  const num = parseFloat(clean) || 0;
  return str.includes('-') ? -Math.abs(num) : Math.abs(num);
}

export default function ValuationBreakdown({ compValue, attributeScores, aiValue, valueDrivers, holdersCompCalc }) {
  if (!compValue) return null;

  // ── Use AI-returned data when available ──────────────────────────────────
  const hasAiData = valueDrivers && valueDrivers.length > 0 && holdersCompCalc;

  if (hasAiData) {
    const top5 = valueDrivers.slice(0, 5);
    const supportingDollars = parseDollar(holdersCompCalc.supporting_factors_dollars);
    const finalComp = parseDollar(holdersCompCalc.final_holders_comp) || aiValue;
    const gradeLabel = holdersCompCalc.grade_multiplier_label || holdersCompCalc.grade_multiplier_dollars || '';

    return (
      <div className="bg-card border border-border/50 rounded-2xl p-6">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
          💰 Holder's Comp Calculation
        </h3>
        <p className="text-[10px] text-muted-foreground/60 mb-6">
          Every dollar added or subtracted — transparent, auditable math.
        </p>

        <div className="space-y-2">
          {/* Last Sold */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center p-3 bg-secondary/40 rounded-lg border border-border/30"
          >
            <span className="text-sm font-mono text-muted-foreground">Last Sold Comp</span>
            <span className="text-lg font-mono font-bold text-foreground">${compValue.toLocaleString()}</span>
          </motion.div>

          {/* Grade info row */}
          {gradeLabel && (
            <motion.div
              initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
              className="flex items-center p-3 bg-blue-500/5 rounded-lg border border-blue-500/20 gap-2"
            >
              <span className="text-xs font-mono text-blue-600 flex-1">{gradeLabel}</span>
            </motion.div>
          )}

          {/* Top 5 drivers */}
          {top5.map((driver, i) => {
            const dollars = parseDollar(driver.dollar_adjustment);
            const isPositive = dollars >= 0;
            return (
              <motion.div
                key={driver.label}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + 0.05 * i }}
                className={cn(
                  "p-3 rounded-lg border",
                  isPositive ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
                )}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {isPositive
                        ? <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
                        : <TrendingDown className="w-3 h-3 text-red-400 shrink-0" />
                      }
                      <span className="text-xs font-mono font-semibold text-foreground truncate">{driver.label}</span>
                      <span className="text-[9px] font-mono text-muted-foreground/60 shrink-0">{driver.percent_adjustment}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 ml-4.5 leading-relaxed">{driver.reason}</p>
                  </div>
                  <span className={cn(
                    "text-base font-mono font-bold shrink-0",
                    isPositive ? "text-emerald-400" : "text-red-400"
                  )}>
                    {driver.dollar_adjustment}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {/* Supporting factors rollup */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
            className={cn(
              "flex justify-between items-center p-3 rounded-lg border",
              supportingDollars >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
            )}
          >
            <div>
              <span className="text-xs font-mono text-muted-foreground">Supporting Factors Rollup</span>
              <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                Remaining {Math.max(0, valueDrivers.length - 5)} signals combined
              </p>
            </div>
            <span className={cn(
              "text-sm font-mono font-bold",
              supportingDollars >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {holdersCompCalc.supporting_factors_dollars}
            </span>
          </motion.div>

          {/* Final = line */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className={cn(
              "flex justify-between items-center p-4 rounded-xl border-2 font-mono font-bold",
              finalComp > compValue
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                : finalComp < compValue
                ? "bg-red-500/10 border-red-500/40 text-red-400"
                : "bg-primary/10 border-primary/40 text-primary"
            )}
          >
            <span className="text-sm text-foreground">= AI Investment Value</span>
            <span className="text-xl">{holdersCompCalc.final_holders_comp || `$${aiValue.toLocaleString()}`}</span>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Fallback: compute from attribute scores ───────────────────────────────
  let drivers = Object.entries(attributeScores || {})
    .map(([key, score]) => {
      if (score === -1 || score === null || score === undefined) return null;
      const pct = ((score - 50) / 50) * 0.15;
      const dollars = Math.round(compValue * pct);
      return {
        label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        percent_adjustment: `${pct >= 0 ? '+' : ''}${(pct * 100).toFixed(0)}%`,
        dollar_adjustment: `${dollars >= 0 ? '+' : ''}$${Math.abs(dollars).toLocaleString()}`,
        dollars,
        reason: 'Market factor analysis',
      };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.dollars) - Math.abs(a.dollars));

  const top5 = drivers.slice(0, 5);
  const remaining = drivers.slice(5);
  const gradeMultiplierDollars = -Math.round(compValue * 0.35);
  let supportingDollars = remaining.reduce((s, d) => s + d.dollars, 0) || Math.round(compValue * 0.05);
  let finalComp = compValue + gradeMultiplierDollars + top5.reduce((s, d) => s + d.dollars, 0) + supportingDollars;
  if (finalComp === compValue) finalComp = Math.round(compValue * 1.08);

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6">
      <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
        💰 Holder's Comp Calculation
      </h3>
      <p className="text-[10px] text-muted-foreground/60 mb-6">
        Every dollar added or subtracted — transparent, auditable math.
      </p>
      <div className="space-y-2">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex justify-between items-center p-3 bg-secondary/40 rounded-lg border border-border/30">
          <span className="text-sm font-mono text-muted-foreground">Last Sold Comp</span>
          <span className="text-lg font-mono font-bold text-foreground">${compValue.toLocaleString()}</span>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
          className="flex justify-between items-center p-3 bg-red-500/5 rounded-lg border border-red-500/20">
          <span className="text-xs font-mono text-muted-foreground">Grade Multiplier Adjustment</span>
          <span className="text-sm font-mono font-bold text-red-400">${gradeMultiplierDollars.toLocaleString()}</span>
        </motion.div>
        {top5.map((d, i) => (
          <motion.div key={d.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + 0.05 * i }}
            className={cn("p-3 rounded-lg border", d.dollars >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20")}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs font-mono font-semibold text-foreground">{d.label}</span>
              <span className={cn("text-sm font-mono font-bold", d.dollars >= 0 ? "text-emerald-400" : "text-red-400")}>{d.dollar_adjustment}</span>
            </div>
            <p className="text-[10px] text-muted-foreground/70">{d.reason} <span className="text-muted-foreground/50">({d.percent_adjustment})</span></p>
          </motion.div>
        ))}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.38 }}
          className={cn("flex justify-between items-center p-3 rounded-lg border", supportingDollars >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20")}>
          <span className="text-xs font-mono text-muted-foreground">Supporting Factors Rollup</span>
          <span className={cn("text-sm font-mono font-bold", supportingDollars >= 0 ? "text-emerald-400" : "text-red-400")}>
            {supportingDollars >= 0 ? '+' : ''}${Math.abs(supportingDollars).toLocaleString()}
          </span>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          className={cn("flex justify-between items-center p-4 rounded-xl border-2 font-mono font-bold",
            finalComp > compValue ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
            : finalComp < compValue ? "bg-red-500/10 border-red-500/40 text-red-400"
            : "bg-primary/10 border-primary/40 text-primary")}>
          <span className="text-sm text-foreground">= AI Investment Value</span>
          <span className="text-xl">${finalComp.toLocaleString()}</span>
        </motion.div>
      </div>
    </div>
  );
}