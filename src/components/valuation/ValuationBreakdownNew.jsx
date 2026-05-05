import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Zap, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ValuationBreakdownNew({ 
  lastSoldPrice, 
  aiValue, 
  valuation_math, 
  top_value_drivers, 
  supporting_factors_rollup, 
  category_impact_summary 
}) {
  if (!valuation_math || !top_value_drivers) return null;

  // Parse dollar strings
  const parsePrice = (str) => {
    if (!str) return 0;
    return parseInt(str.replace(/[^0-9-]/g, ''));
  };

  const lastSold = parsePrice(valuation_math.last_sold_price);
  const final = parsePrice(valuation_math.final_ai_value);
  const diffDollars = final - lastSold;
  const diffPercent = lastSold > 0 ? ((diffDollars / lastSold) * 100).toFixed(1) : '0';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* 1. TOP VALUE DRIVERS */}
      <div className="bg-card border border-border/50 rounded-2xl p-6">
        <h3 className="text-sm font-mono uppercase tracking-wider text-primary mb-4">
          🚀 Top Value Drivers
        </h3>
        <div className="space-y-3">
          {top_value_drivers.map((driver, idx) => {
            const isDollarPositive = driver.dollar_adjustment.includes('+');
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  'flex items-start justify-between p-3 rounded-lg border',
                  isDollarPositive
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {isDollarPositive ? (
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    )}
                    <p className="text-xs font-semibold text-foreground">{driver.label}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{driver.reason}</p>
                </div>
                <p
                  className={cn(
                    'text-sm font-mono font-bold ml-4 shrink-0',
                    isDollarPositive ? 'text-emerald-500' : 'text-red-500'
                  )}
                >
                  {driver.dollar_adjustment}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 2. SUPPORTING FACTORS ROLLUP */}
      {supporting_factors_rollup && (
        <div className="bg-card border border-border/50 rounded-2xl p-6">
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">
            📌 Supporting Factors
          </h3>
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/30">
            <p className="text-xs text-muted-foreground">{supporting_factors_rollup.description}</p>
            <p className="text-sm font-mono font-bold ml-4 shrink-0">
              {supporting_factors_rollup.net_dollar_adjustment}
            </p>
          </div>
        </div>
      )}

      {/* 3. CATEGORY IMPACT SUMMARY */}
      {category_impact_summary && (
        <div className="bg-card border border-border/50 rounded-2xl p-6">
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">
            📊 By Category
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'card_dna', label: 'Card DNA' },
              { key: 'scarcity_population', label: 'Scarcity & Pop' },
              { key: 'market_momentum', label: 'Market Momentum' },
              { key: 'player_thesis', label: 'Player Thesis' },
              { key: 'risk_adjustments', label: 'Risk Adjustments' }
            ].map(cat => {
              const val = category_impact_summary[cat.key] || '$0';
              const isPos = !val.includes('-');
              return (
                <motion.div
                  key={cat.key}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'p-3 rounded-lg border',
                    isPos
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  )}
                >
                  <p className="text-[10px] text-muted-foreground mb-1">{cat.label}</p>
                  <p className={cn('text-xs font-mono font-bold', isPos ? 'text-emerald-500' : 'text-red-500')}>
                    {val}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. TRANSPARENT VALUATION MATH */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
        <h3 className="text-sm font-mono uppercase tracking-wider text-primary mb-4">
          ✓ The Math
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Last Sold Price</p>
            <p className="font-mono font-bold">{valuation_math.last_sold_price}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Top Drivers</p>
            <p className="font-mono font-bold">{valuation_math.top_driver_adjustments}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Supporting Factors</p>
            <p className="font-mono font-bold">{valuation_math.supporting_factors}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Eye Appeal (Grade {valuation_math.eye_appeal_adjustment.split('$')[1] ? 'Adjustment' : 'N/A'})</p>
            <p className="font-mono font-bold">{valuation_math.eye_appeal_adjustment}</p>
          </div>
          <div className="border-t border-primary/20 pt-2 mt-2 flex justify-between items-center font-bold">
            <p className="text-foreground">AI Investment Value</p>
            <p className="font-mono text-lg text-primary">{valuation_math.final_ai_value}</p>
          </div>
          <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-2 px-2">
            <p>{diffPercent >= 0 ? '+' : ''}{diffPercent}% vs Last Sold</p>
            <p>{diffDollars > 0 ? '+' : ''}{diffDollars.toLocaleString()} dollars</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}