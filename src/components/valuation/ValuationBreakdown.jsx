import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';


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
        {reason && <p className="text-sm text-foreground/75 mt-0.5 leading-snug">{reason}</p>}
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

// Parse a percent string like "+12%" or "-5.5%" into a float (e.g. 0.12, -0.055)
function parsePct(str) {
  if (!str) return 0;
  const isNeg = str.includes('-');
  const num = parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
  return isNeg ? -(num / 100) : num / 100;
}

export default function ValuationBreakdown({ compValue, aiValue, valueDrivers, holdersCompCalc }) {
  const hasDriverData = valueDrivers && valueDrivers.length > 0;
  const base = compValue > 0 ? compValue : 0;

  // Always compute dollar adjustments ourselves from percent_adjustment × compValue
  // Clamp each driver to ±25% of base to prevent hallucinated huge numbers
  const drivers = hasDriverData
    ? valueDrivers.map(d => {
        const rawPct = parsePct(d.percent_adjustment);
        const clampedPct = Math.max(-0.25, Math.min(0.25, rawPct));
        return {
          label: d.label,
          dollars: base > 0 ? Math.round(clampedPct * base) : 0,
          reason: d.reason,
        };
      })
    : [];

  // Sum of displayed drivers
  const driverTotal = drivers.reduce((sum, d) => sum + d.dollars, 0);

  // Supporting factors = gap between drivers and actual diff
  // Hide if absurdly large (more than 2× the base) — means AI math is broken
  const actualDiff = base > 0 ? (aiValue || 0) - base : 0;
  const rawSupportingDollars = drivers.length > 0 ? actualDiff - driverTotal : 0;
  const supportingDollars = base > 0 && Math.abs(rawSupportingDollars) > base * 2 ? 0 : rawSupportingDollars;

  // True final AI value for the = row
  const finalValue = aiValue || 0;
  const diff = compValue > 0 ? finalValue - compValue : 0;

  if (!compValue && !finalValue) return null;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/30">
      <h3 className="text-sm font-bold text-foreground">How We Calculate What This Card Is Worth</h3>
      <p className="text-sm text-foreground/80 mt-1">
        We start with what someone actually paid for it (Last Sold). Then we look at factors like player demand, card rarity, and condition to adjust that price up or down.
      </p>
      </div>

      <div className="px-4 py-4 space-y-2">

        {/* ── COMP ANCHOR ── */}
         <motion.div
           initial={{ opacity: 0, y: 6 }}
           animate={{ opacity: 1, y: 0 }}
           className="flex items-center justify-between px-4 py-4 rounded-xl bg-primary/5 border border-primary/25"
         >
           <div>
             <p className="text-xs font-mono uppercase tracking-wider text-primary mb-0.5">Last Sold Price</p>
             <p className="text-xs text-muted-foreground">The most recent actual sale price — this is our starting point</p>
           </div>
           <span className="text-2xl font-mono font-bold text-foreground">
             {compValue > 0 ? `$${compValue.toLocaleString()}` : '—'}
           </span>
         </motion.div>

         {/* ── DIVIDER ── */}
         <div className="flex items-center gap-2 px-2 py-1">
           <div className="flex-1 h-px bg-border/40" />
           <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Value adjustments based on factors below</span>
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
              <p className="text-sm font-semibold text-foreground">Other factors combined</p>
              <p className="text-xs text-muted-foreground">Additional signals that add or subtract value</p>
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
            )}>What This Card Is Worth</p>
            {compValue > 0 && (
              <p className={cn('text-xs font-semibold',
                diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-500' : 'text-muted-foreground'
              )}>
                {diff > 0 ? '+' : ''}{fmt(diff)} difference from last sold
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