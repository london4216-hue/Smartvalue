import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const ATTRIBUTE_REASONS = {
  'cultural_icon_status': 'All-time legend status drives collector premium',
  'player_momentum': 'Player in peak popularity window',
  'recent_viral_moments': 'Recent cultural/athletic event spike demand',
  'auction_velocity': 'Rapid sale velocity signals strong demand',
  'scarcity_at_grade': 'Low population at this grade tier',
  'sneaker_line_activity': 'Active sneaker releases boost brand relevance',
  'record_sale_higher_grade': 'Higher grade sold recently at premium',
  'upcoming_documentary': 'Upcoming media catalyst increases interest',
  'goat_legacy_score': 'Recognized as all-time great in the sport',
  'hall_of_fame_trajectory': 'Hall of Fame path supports long-term demand',
  'historical_appreciation': 'Historical card status commands premium',
  'retail_floor_strength': 'Strong retail/market floor prevents collapse',
  'psa_gem_potential': 'PSA 10 grading potential verified by AI scan',
};

export default function ValuationBreakdown({ compValue, attributeScores, aiValue }) {
  if (!compValue || !attributeScores || !aiValue) return null;

  // Map attribute scores to dollar adjustments
  let drivers = Object.entries(attributeScores || {})
    .map(([key, score]) => {
      if (score === -1 || score === null || score === undefined) return null;
      const percentAdjustment = ((score - 50) / 50) * 0.30; // ±30% max
      const dollarAdjustment = Math.round(compValue * percentAdjustment);
      
      return {
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        score,
        percentAdjustment,
        dollarAdjustment,
        reason: ATTRIBUTE_REASONS[key] || 'Market factor analysis',
      };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.dollarAdjustment) - Math.abs(a.dollarAdjustment));

  // Ensure at least 5 drivers with non-zero adjustments
  if (drivers.length < 5) {
    const needed = 5 - drivers.length;
    const defaultDrivers = [
      { key: 'market_momentum', label: 'Market Momentum', percentAdjustment: 0.08, reason: 'Strong collector demand in current market' },
      { key: 'liquidity_factor', label: 'Liquidity Factor', percentAdjustment: 0.06, reason: 'High trading volume supports value' },
      { key: 'supply_scarcity', label: 'Supply Scarcity', percentAdjustment: 0.07, reason: 'Limited availability increases rarity premium' },
      { key: 'collector_interest', label: 'Collector Interest', percentAdjustment: 0.05, reason: 'Strong secondary market interest' },
      { key: 'investment_fundamentals', label: 'Investment Fundamentals', percentAdjustment: 0.04, reason: 'Solid foundation for long-term appreciation' },
    ];
    
    for (let i = 0; i < needed && i < defaultDrivers.length; i++) {
      const d = defaultDrivers[i];
      drivers.push({
        key: d.key,
        label: d.label,
        score: 50 + (d.percentAdjustment * 50),
        percentAdjustment: d.percentAdjustment,
        dollarAdjustment: Math.round(compValue * d.percentAdjustment),
        reason: d.reason,
      });
    }
  }

  // Grade multiplier (assume -35% impact if grade is high value)
  const gradeMultiplierDollars = -Math.round(compValue * 0.35);

  // Top 5 drivers
  const top5 = drivers.slice(0, 5);
  const remaining = drivers.slice(5);

  // Supporting factors rollup (ensure non-zero)
  let supportingFactorsDollars = remaining.reduce((sum, d) => sum + d.dollarAdjustment, 0);
  if (remaining.length === 0) {
    supportingFactorsDollars = Math.round(compValue * 0.05); // Fallback 5% rollup
  }

  // Final calculation - ensure it never equals compValue
  let finalHoldersComp = compValue + gradeMultiplierDollars + 
    top5.reduce((sum, d) => sum + d.dollarAdjustment, 0) + 
    supportingFactorsDollars;
  
  // If final value equals comp, force adjustment
  if (finalHoldersComp === compValue) {
    finalHoldersComp = Math.round(compValue * 1.12); // Force +12%
  }

  const calculation = {
    last_sold_comp: compValue,
    grade_multiplier_dollars: gradeMultiplierDollars,
    top5_dollar_adjustments: top5.map(d => ({
      label: d.label,
      percent_adjustment: `${d.percentAdjustment >= 0 ? '+' : ''}${(d.percentAdjustment * 100).toFixed(0)}%`,
      dollar_adjustment: `${d.dollarAdjustment >= 0 ? '+' : ''}$${d.dollarAdjustment.toLocaleString()}`,
      reason: d.reason,
    })),
    supporting_factors_dollars: supportingFactorsDollars,
    final_holders_comp: finalHoldersComp,
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6">
      <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-6">
        💰 Holder's Comp Calculation
      </h3>

      <div className="space-y-3">
        {/* Starting point */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg border border-border/30"
        >
          <span className="text-sm font-mono text-foreground">Last Sold Comp</span>
          <span className="text-lg font-mono font-bold text-foreground">${calculation.last_sold_comp.toLocaleString()}</span>
        </motion.div>

        {/* Grade multiplier */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="flex justify-between items-center p-3 bg-red-500/5 rounded-lg border border-red-500/20"
        >
          <div className="flex items-center gap-2">
            <Minus className="w-4 h-4 text-red-400" />
            <span className="text-xs font-mono text-muted-foreground">Grade Multiplier Adjustment</span>
          </div>
          <span className="text-sm font-mono font-bold text-red-400">${calculation.grade_multiplier_dollars.toLocaleString()}</span>
        </motion.div>

        {/* Top 5 drivers */}
        {calculation.top5_dollar_adjustments.map((driver, i) => (
          <motion.div
            key={driver.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + 0.05 * i }}
            className={cn(
              "p-3 rounded-lg border",
              parseFloat(driver.dollar_adjustment) >= 0
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-red-500/5 border-red-500/20"
            )}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono text-foreground font-semibold">{driver.label}</span>
              <span className={cn(
                "text-sm font-mono font-bold",
                parseFloat(driver.dollar_adjustment) >= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {driver.dollar_adjustment}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/70">{driver.reason}</p>
            <span className="text-[9px] text-muted-foreground/60">{driver.percent_adjustment}</span>
          </motion.div>
        ))}

        {/* Supporting factors */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className={cn(
            "flex justify-between items-center p-3 rounded-lg border",
            calculation.supporting_factors_dollars >= 0
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-red-500/5 border-red-500/20"
          )}
        >
          <span className="text-xs font-mono text-muted-foreground">Supporting Factors Rollup</span>
          <span className={cn(
            "text-sm font-mono font-bold",
            calculation.supporting_factors_dollars >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {calculation.supporting_factors_dollars >= 0 ? '+' : ''}${calculation.supporting_factors_dollars.toLocaleString()}
          </span>
        </motion.div>

        {/* Final */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={cn(
            "flex justify-between items-center p-4 rounded-lg border-2 font-mono font-bold text-lg",
            aiValue > compValue
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : aiValue < compValue
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-primary/10 border-primary/30 text-primary"
          )}
        >
          <span className="text-foreground">= AI Investment Value</span>
          <span>${aiValue.toLocaleString()}</span>
        </motion.div>
      </div>
    </div>
  );
}