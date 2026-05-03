import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ValuationBreakdown({ compValue, attributeScores, aiValue }) {
  if (!compValue || !attributeScores || !aiValue) return null;

  // Build line items from attribute scores
  const positiveFactors = [];
  const negativeFactors = [];

  Object.entries(attributeScores || {}).forEach(([key, score]) => {
    if (score > 70) {
      const impact = ((score - 50) / 50) * (compValue * 0.15);
      positiveFactors.push({ label: key, score, impact: Math.round(impact) });
    } else if (score < 30) {
      const impact = ((50 - score) / 50) * (compValue * 0.15);
      negativeFactors.push({ label: key, score, impact: Math.round(impact) });
    }
  });

  const totalPositive = positiveFactors.reduce((sum, f) => sum + f.impact, 0);
  const totalNegative = negativeFactors.reduce((sum, f) => sum + f.impact, 0);
  const calculated = compValue + totalPositive - totalNegative;

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6">
      <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-6">
        💰 AI Valuation Calculation Breakdown
      </h3>

      <div className="space-y-4">
        {/* Starting point */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg border border-border/30"
        >
          <span className="text-sm font-mono text-foreground">Last Sold Comp</span>
          <span className="text-lg font-mono font-bold text-foreground">${compValue.toLocaleString()}</span>
        </motion.div>

        {/* Positive factors */}
        {positiveFactors.length > 0 && (
          <div className="space-y-2">
            {positiveFactors.map((factor, i) => (
              <motion.div
                key={factor.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex justify-between items-center p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono text-muted-foreground capitalize">{factor.label.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-sm font-mono font-bold text-emerald-400">+${factor.impact.toLocaleString()}</span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Negative factors */}
        {negativeFactors.length > 0 && (
          <div className="space-y-2">
            {negativeFactors.map((factor, i) => (
              <motion.div
                key={factor.label}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex justify-between items-center p-3 bg-red-500/5 rounded-lg border border-red-500/20"
              >
                <div className="flex items-center gap-2">
                  <Minus className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-mono text-muted-foreground capitalize">{factor.label.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-sm font-mono font-bold text-red-400">-${factor.impact.toLocaleString()}</span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Total */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "flex justify-between items-center p-4 rounded-lg border-2 font-mono font-bold text-lg",
            aiValue > compValue
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : aiValue < compValue
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-primary/10 border-primary/30 text-primary"
          )}
        >
          <span className="text-foreground">AI Investment Value</span>
          <span>${aiValue.toLocaleString()}</span>
        </motion.div>
      </div>
    </div>
  );
}