import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ShoppingCart, DollarSign, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTION_CONFIG = {
  strong_buy: {
    label: '🔥 STRONG BUY',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    icon: ShoppingCart,
    thesis: 'AI value is 20%+ above last sale. This card is underpriced based on 44 data-point analysis of scarcity, condition, player momentum, and market trends.'
  },
  buy: {
    label: '✓ BUY IT',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
    icon: ShoppingCart,
    thesis: 'AI value is 8-20% above last sale. Attributes justify meaningful upside vs. last comp — good entry relative to fundamentals.'
  },
  hold: {
    label: '⏳ HOLD / FAIR VALUE',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    icon: Clock,
    thesis: 'AI value is within 2% of last sale. Price appears fair. No clear edge yet — wait for better opportunity or hold if you own it.'
  },
  sell: {
    label: '📉 SELL',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    icon: DollarSign,
    thesis: 'AI value is 10-25% below last sale. Attributes suggest overvaluation vs. current market trends. Consider selling or passing.'
  },
  strong_sell: {
    label: '⚠️ STRONG SELL',
    color: 'text-red-500',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: DollarSign,
    thesis: 'AI value is 25%+ below last sale. Significant overvaluation signal based on pop trends, supply scarcity, and player momentum. Avoid or exit.'
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