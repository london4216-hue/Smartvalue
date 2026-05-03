import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ShoppingCart, DollarSign, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTION_CONFIG = {
  strong_buy: {
    label: '🔥 BUY IT NOW',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    icon: ShoppingCart,
    thesis: 'This card is significantly underpriced relative to its investment potential. Current market price offers excellent entry point with strong upside.'
  },
  buy: {
    label: '✓ BUY IT',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
    icon: ShoppingCart,
    thesis: 'Good opportunity to buy. The AI value exceeds the current price with room for appreciation.'
  },
  hold: {
    label: '⏳ WAIT FOR IT',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    icon: Clock,
    thesis: 'Current price is fair relative to fundamentals. Wait for a better entry point or hold if you already own it.'
  },
  sell: {
    label: '💰 SELL AT THIS PRICE',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    icon: DollarSign,
    thesis: 'Market price exceeds AI valuation. Good time to sell and lock in gains or redeploy capital.'
  },
  strong_sell: {
    label: '⚠️ STRONG SELL',
    color: 'text-red-500',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: DollarSign,
    thesis: 'Card is significantly overvalued. Strong sell signal — avoid at current price.'
  }
};

export default function InvestmentThesis({ compValue, aiValue, flipVsHold, cheapestAvailable }) {
  const valueDiff = compValue > 0 ? ((aiValue - compValue) / compValue * 100).toFixed(1) : null;
  const marginOfSafety = compValue > 0 ? ((aiValue - compValue) / aiValue * 100).toFixed(1) : null;

  // Override recommendation if AI value equals or is less than comp — that's a hold/sell signal
  let recommendation = flipVsHold;
  if (compValue > 0) {
    if (aiValue <= compValue) {
      recommendation = aiValue < (compValue * 0.85) ? 'sell' : 'hold';
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
              {config.thesis}
            </p>
          </div>
        </div>

        {/* Price Comparison */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border/20">
          {/* Last Sale */}
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">
              Last Sale Price
            </p>
            <p className="text-xl font-mono font-bold text-foreground">
              ${(compValue || aiValue).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              What it sold for
            </p>
          </div>

          {/* AI Value */}
          <div>
            <p className="text-xs text-primary font-mono uppercase tracking-wider mb-1">
              Our AI Value
            </p>
            <p className="text-xl font-mono font-bold text-primary">
              ${aiValue.toLocaleString()}
            </p>
            <p className="text-[10px] text-primary/70 mt-1">
              What we think it's worth
            </p>
          </div>

          {/* Difference */}
          {valueDiff !== null && (
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">
                Difference
              </p>
              <p className={cn('text-xl font-mono font-bold', parseFloat(valueDiff) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {parseFloat(valueDiff) >= 0 ? '+' : ''}{valueDiff}%
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {parseFloat(valueDiff) >= 0 ? 'Underpriced' : 'Overpriced'}
              </p>
            </div>
          )}
        </div>

        {/* Margin of Safety / Upside */}
        {marginOfSafety !== null && (
          <div className="bg-background/50 rounded-lg p-3 border border-border/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {parseFloat(valueDiff) >= 0 ? '📈 Upside Potential' : '📉 Downside Risk'}
              </span>
              <span className={cn('text-sm font-bold font-mono', parseFloat(valueDiff) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {parseFloat(valueDiff) >= 0 ? '+' : ''}{marginOfSafety}%
              </span>
            </div>
          </div>
        )}

        {/* Current Market Context */}
        {cheapestAvailable && (
          <div className="bg-background/50 rounded-lg p-3 border border-border/20 text-xs">
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">Current market:</span> Cheapest available is ${cheapestAvailable.toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}