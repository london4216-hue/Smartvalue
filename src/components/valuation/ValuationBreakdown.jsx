import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

function parseDollar(str) {
  if (!str) return 0;
  const isNeg = str.includes('-');
  const num = parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
  return isNeg ? -num : num;
}

function fmt(n) {
  const abs = Math.abs(Math.round(n)).toLocaleString('en-US');
  if (n > 0) return `+$${abs}`;
  if (n < 0) return `-$${abs}`;
  return '$0';
}

function DriverRow({ label, dollars, reason, delay }) {
  const isPos = dollars > 0;
  const isNeg = dollars < 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border',
        isPos && 'bg-emerald-500/5 border-emerald-500/20',
        isNeg && 'bg-red-500/5 border-red-500/20',
        !isPos && !isNeg && 'bg-secondary/40 border-border/30'
      )}
    >
      <div className="mt-0.5 shrink-0">
        {isPos && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
        {isNeg && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
        {!isPos && !isNeg && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
        {reason && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{reason}</p>}
      </div>
      <span className={cn(
        'text-base font-mono font-bold shrink-0',
        isPos && 'text-emerald-500',
        isNeg && 'text-red-500',
        !isPos && !isNeg && 'text-muted-foreground'
      )}>
        {fmt(dollars)}
      </span>
    </motion.div>
  );
}

export default function ValuationBreakdown({ compValue, aiValue, valueDrivers, holdersCompCalc }) {
  // ── Prefer backend/AI-returned driver data ────────────────────────────────
  const hasDriverData = valueDrivers && valueDrivers.length > 0;

  // Build driver list — from backend value_drivers or fallback to empty
  const drivers = hasDriverData
    ? valueDrivers.map(d => ({
        label: d.label,
        dollars: parseDollar(d.dollar_adjustment),
        reason: d.reason,
      }))
    : [];

  // Supporting / rollup dollar amount
  const supportingDollars = holdersCompCalc
    ? parseDollar(holdersCompCalc.supporting_factors_dollars)
    : 0;

  // True final AI value for the = row
  const finalValue = aiValue || 0;
  const diff = compValue > 0 ? finalValue - compValue : 0;

  if (!compValue && !finalValue) return null;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/30">
      <h3 className="text-sm font-bold text-foreground">How AI Value Is Calculated</h3>
      <p className="text-xs text-muted-foreground mt-1">
        Last sold price is the 90% anchor. Every signal below adds or subtracts dollars from that baseline.
      </p>
      </div>

      <div className="px-4 py-4 space-y-2">

        {/* ── COMP ANCHOR (90%) ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-4 rounded-xl bg-primary/5 border border-primary/25"
        >
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-primary mb-0.5">Last Sold (90% Anchor)</p>
            <p className="text-xs text-muted-foreground">What someone actually paid — your baseline</p>
          </div>
          <span className="text-2xl font-mono font-bold text-foreground">
            {compValue > 0 ? `$${compValue.toLocaleString()}` : '—'}
          </span>
        </motion.div>

        {/* ── DIVIDER ── */}
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">AI signal adjustments</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        {/* ── INDIVIDUAL DRIVERS ── */}
        {drivers.length > 0 ? (
          drivers.map((d, i) => (
            <DriverRow key={d.label} label={d.label} dollars={d.dollars} reason={d.reason} delay={0.05 + i * 0.04} />
          ))
        ) : (
          <div className="px-4 py-3 text-xs text-muted-foreground text-center">No signal breakdown available</div>
        )}

        {/* ── SUPPORTING FACTORS ROLLUP ── */}
        {supportingDollars !== 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className={cn(
              'flex items-center justify-between px-4 py-3 rounded-xl border',
              supportingDollars >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
            )}
          >
            <div>
              <p className="text-sm font-semibold text-foreground">Remaining signals (combined)</p>
              <p className="text-xs text-muted-foreground">{Math.max(0, (valueDrivers?.length || 0) - drivers.length + (holdersCompCalc ? 1 : 0))} additional factors rolled up</p>
            </div>
            <span className={cn('text-base font-mono font-bold', supportingDollars >= 0 ? 'text-emerald-500' : 'text-red-500')}>
              {fmt(supportingDollars)}
            </span>
          </motion.div>
        )}

        {/* ── EQUALS LINE ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className={cn(
            'flex items-center justify-between px-4 py-4 rounded-xl border-2 mt-1',
            diff > 0 ? 'bg-emerald-500/10 border-emerald-500/50' :
            diff < 0 ? 'bg-red-500/10 border-red-500/50' :
            'bg-primary/10 border-primary/40'
          )}
        >
          <div>
            <p className={cn('text-xs font-mono uppercase tracking-wider mb-0.5',
              diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-500' : 'text-primary'
            )}>= AI Investment Value</p>
            {compValue > 0 && (
              <p className={cn('text-xs font-semibold',
                diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-500' : 'text-muted-foreground'
              )}>
                {diff > 0 ? '+' : ''}{fmt(diff)} vs last sold
              </p>
            )}
          </div>
          <span className={cn(
            'text-3xl font-mono font-bold',
            diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-500' : 'text-primary'
          )}>
            ${finalValue.toLocaleString()}
          </span>
        </motion.div>
      </div>
    </div>
  );
}