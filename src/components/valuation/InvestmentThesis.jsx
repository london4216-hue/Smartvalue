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
    thesis: 'AI value is 8-20% above last sold. Attributes justify meaningful upside vs. last sold price — good entry relative to fundamentals.'
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

          {/* ── VERDICT BANNERS ── */}
          {/* Asking vs AI Value — the most critical signal */}
          {cheapestAvailable && aiValue > 0 && (() => {
            const askVsAi = ((cheapestAvailable - aiValue) / aiValue * 100).toFixed(1);
            const overpricedByAsk = parseFloat(askVsAi) > 5;
            const dealByAsk = parseFloat(askVsAi) < -5;
            if (!overpricedByAsk && !dealByAsk) return null;
            return (
              <div className={cn(
                'rounded-xl px-4 py-3 border flex items-center justify-between gap-3',
                overpricedByAsk ? 'bg-red-500/10 border-red-500/40' : 'bg-emerald-500/10 border-emerald-500/40'
              )}>
                <p className={cn('text-sm font-bold', overpricedByAsk ? 'text-red-400' : 'text-emerald-400')}>
                  {overpricedByAsk
                    ? `⚠️ Asking price is ${askVsAi}% ABOVE AI value — seller is overpriced`
                    : `✅ Asking price is ${Math.abs(parseFloat(askVsAi))}% BELOW AI value — potential deal`}
                </p>
                <span className={cn('text-sm font-mono font-bold shrink-0', overpricedByAsk ? 'text-red-400' : 'text-emerald-400')}>
                  {parseFloat(askVsAi) >= 0 ? '+' : ''}{askVsAi}%
                </span>
              </div>
            );
          })()}

          {/* Last Sold vs AI Value */}
          {valueDiff !== null && (
            <div className="rounded-xl px-4 py-3 border bg-background/50 border-border/20 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Last sold vs AI value:
                <span className={cn('ml-1 font-semibold', parseFloat(valueDiff) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {parseFloat(valueDiff) >= 0 ? 'card appears underpriced' : 'card appears overpriced'} at last sale
                </span>
              </p>
              <span className={cn('text-sm font-mono font-bold shrink-0', parseFloat(valueDiff) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {parseFloat(valueDiff) >= 0 ? '+' : ''}{valueDiff}%
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}