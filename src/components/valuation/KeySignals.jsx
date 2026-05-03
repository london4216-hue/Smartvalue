import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const IMPACT_CONFIG = {
  bullish:  { icon: TrendingUp,   bar: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-400/20', bg: 'bg-emerald-400/5'  },
  bearish:  { icon: TrendingDown, bar: 'bg-red-400',     text: 'text-red-400',     border: 'border-red-400/20',     bg: 'bg-red-400/5'      },
  neutral:  { icon: Zap,          bar: 'bg-yellow-400',  text: 'text-yellow-400',  border: 'border-yellow-400/20',  bg: 'bg-yellow-400/5'   },
};

export default function KeySignals({ signals = [] }) {
  if (!signals || signals.length === 0) return null;

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-mono uppercase tracking-wider text-primary">
          Key Value Drivers
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground ml-1">— what's really moving this card</span>
      </div>

      <div className="space-y-2.5">
        {signals.map((signal, i) => {
          const cfg = IMPACT_CONFIG[signal.direction] || IMPACT_CONFIG.neutral;
          const Icon = cfg.icon;
          const impactPct = Math.abs(signal.impact_pct || 0);
          // bar width: map impact_pct 0–30 → 10–100%
          const barWidth = Math.min(100, Math.max(10, (impactPct / 30) * 100));

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className={cn(
                'rounded-xl border p-3 sm:p-4',
                cfg.border, cfg.bg
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('mt-0.5 shrink-0', cfg.text)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground leading-tight">
                      {signal.label}
                    </span>
                    <span className={cn('text-xs font-mono font-bold shrink-0', cfg.text)}>
                      {signal.direction === 'bearish' ? '−' : '+'}{impactPct}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {signal.reason}
                  </p>
                  {/* Impact bar */}
                  <div className="mt-2 h-1 bg-secondary/80 rounded-full overflow-hidden">
                    <motion.div
                      className={cn('h-full rounded-full', cfg.bar)}
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ delay: i * 0.07 + 0.15, duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}