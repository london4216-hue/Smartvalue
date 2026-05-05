import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ShoppingCart, DollarSign, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTION_CONFIG = {
  strong_buy: {
    label: '🔥 Great Buy Opportunity',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    icon: ShoppingCart,
    thesis: (comp, ai) => `This card is undervalued by the market. Last sold price is well below what it should be worth. Good opportunity to buy.`
  },
  buy: {
    label: '✓ Good Buy',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
    icon: ShoppingCart,
    thesis: (comp, ai) => `This card is slightly undervalued. The last sale price is a decent entry point. Look for similar prices before buying.`
  },
  hold: {
    label: '⏳ Fairly Priced',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    icon: Clock,
    thesis: (comp, ai) => `This card is priced fairly. No major advantage to buy or sell right now. Wait for a better price if you're thinking about buying.`
  },
  sell: {
    label: '⚠️ Overpriced',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    icon: DollarSign,
    thesis: (comp, ai) => `Be careful — this card sold for more than it's worth. Don't pay that much. Look for lower prices elsewhere.`
  },
  strong_sell: {
    label: '🚨 Avoid — Too Expensive',
    color: 'text-red-500',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: DollarSign,
    thesis: (comp, ai) => `This card is significantly overpriced. The market paid too much. Skip it and find a better deal.`
  }
};

export default function InvestmentThesis({ compValue, aiValue, flipVsHold, cheapestAvailable }) {
  const valueDiff = compValue > 0 ? ((aiValue - compValue) / compValue * 100).toFixed(1) : null;
  const marginOfSafety = compValue > 0 ? ((aiValue - compValue) / aiValue * 100).toFixed(1) : null;

  // Enforce: AI value must ALWAYS differ from comp
  // If they're equal or within rounding error, force a recommendation
  let recommendation = flipVsHold;
  if (compValue > 0) {
    const percentDiff = parseFloat(valueDiff);
    
    // AI value must be meaningfully different (at least ±2%)
    if (Math.abs(percentDiff) < 2) {
      // If essentially equal, this is a data/logic error — default to hold
      recommendation = 'hold';
    } else if (percentDiff > 0) {
      // AI value > comp: strong upside indicates buy/strong_buy
      if (percentDiff >= 20) {
        recommendation = 'strong_buy';
      } else if (percentDiff >= 8) {
        recommendation = 'buy';
      } else {
        recommendation = 'hold';
      }
    } else {
      // AI value < comp: downside indicates sell/strong_sell
      if (percentDiff <= -25) {
        recommendation = 'strong_sell';
      } else if (percentDiff <= -10) {
        recommendation = 'sell';
      } else {
        recommendation = 'hold';
      }
    }
  }

  const config = ACTION_CONFIG[recommendation] || ACTION_CONFIG.hold;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('border rounded-2xl p-6 sm:p-7', config.bg)}
    >
      <div className="space-y-5">
        {/* Action Header */}
        <div className="flex items-start gap-3">
          <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', config.color)} />
          <div className="flex-1">
            <h3 className={cn('text-lg font-bold', config.color)}>
              {config.label}
            </h3>
            <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
              {typeof config.thesis === 'function' ? config.thesis(compValue, aiValue) : config.thesis}
            </p>
          </div>
        </div>

        {/* ── THE THREE PRICES — THE CORE DECISION ── */}
        <div className="pt-2 border-t border-border/20 space-y-3">

          {/* Three-column price row */}
          <div className="grid grid-cols-3 gap-2">
            {/* Asking Price (what seller wants) */}
            <div className={cn(
              'rounded-xl p-3 border flex flex-col',
              cheapestAvailable
                ? cheapestAvailable > (aiValue || 0)
                  ? 'bg-red-500/8 border-red-500/30'
                  : 'bg-amber-500/8 border-amber-500/25'
                : 'bg-secondary/40 border-border/30 opacity-60'
            )}>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Asking Price</p>
              {cheapestAvailable ? (
                <>
                  <p className={cn('text-xl font-mono font-bold',
                    cheapestAvailable > (aiValue || 0) ? 'text-red-400' : 'text-amber-400'
                  )}>${cheapestAvailable.toLocaleString()}</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-1">What seller wants now</p>
                </>
              ) : (
                <>
                  <p className="text-base font-mono font-bold text-muted-foreground">—</p>
                  <p className="text-[9px] text-muted-foreground/50 mt-1">Not provided</p>
                </>
              )}
            </div>

            {/* Last Sold */}
            <div className={cn(
              'rounded-xl p-3 border flex flex-col',
              compValue > 0 ? 'bg-emerald-500/8 border-emerald-500/25' : 'bg-red-500/8 border-red-500/25'
            )}>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Last Sold</p>
              {compValue > 0 ? (
                <>
                  <p className="text-xl font-mono font-bold text-emerald-400">${compValue.toLocaleString()}</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-1">What buyer paid</p>
                </>
              ) : (
                <>
                  <p className="text-base font-mono font-bold text-red-400">No comp</p>
                  <p className="text-[9px] text-red-400/60 mt-1">⚠ None found</p>
                </>
              )}
            </div>

            {/* AI Value */}
            <div className="rounded-xl p-3 border bg-primary/8 border-primary/30 flex flex-col">
              <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-1">AI Value</p>
              <p className="text-xl font-mono font-bold text-primary">${(aiValue || 0).toLocaleString()}</p>
              <p className="text-[9px] text-primary/60 mt-1">44-signal model</p>
            </div>
          </div>



          {/* ── VERDICT 2: Is the card itself fairly valued by the market? ── */}
          {valueDiff !== null && (() => {
            const diff = parseFloat(valueDiff);
            const isUnder = diff >= 8;
            const isOver = diff <= -8;
            return (
              <div className={cn(
                'rounded-xl p-4 border',
                isUnder ? 'bg-emerald-500/8 border-emerald-500/25' :
                isOver ? 'bg-red-500/8 border-red-500/25' :
                'bg-secondary/40 border-border/20'
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                       Is This Card A Good Investment?
                     </p>
                     <p className={cn('text-sm font-bold leading-snug',
                       isUnder ? 'text-emerald-400' : isOver ? 'text-red-400' : 'text-foreground/70'
                     )}>
                       {isUnder
                         ? `Yes — The market sold this card too cheap. It's worth more than what people paid.`
                         : isOver
                         ? `No — The market paid too much. It's worth less than the last sale.`
                         : `Maybe — The price is about fair. No obvious advantage.`}
                     </p>
                  </div>
                  <span className={cn('text-2xl font-mono font-bold shrink-0',
                    isUnder ? 'text-emerald-400' : isOver ? 'text-red-400' : 'text-muted-foreground'
                  )}>
                    {diff >= 0 ? '+' : ''}{valueDiff}%
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </motion.div>
  );
}