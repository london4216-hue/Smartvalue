import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ArrowRight, Bookmark, Shield, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ScoreGauge from './ScoreGauge';
import AttributeBreakdown from './AttributeBreakdown';
import { GRADE_WEIGHTS, GRADE_TIER_LABELS } from './AttributeCategories';

const RECOMMENDATION_CONFIG = {
  strong_buy: { label: 'Strong Buy', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', icon: TrendingUp },
  buy: { label: 'Buy', color: 'text-emerald-300', bg: 'bg-emerald-300/10 border-emerald-300/20', icon: TrendingUp },
  hold: { label: 'Hold', color: 'text-primary', bg: 'bg-primary/10 border-primary/20', icon: Minus },
  sell: { label: 'Sell', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', icon: TrendingDown },
  strong_sell: { label: 'Strong Sell', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', icon: TrendingDown },
};

export default function ValuationResult({ result, onSave, onReset }) {
  const rec = RECOMMENDATION_CONFIG[result.flip_vs_hold] || RECOMMENDATION_CONFIG.hold;
  const RecIcon = rec.icon;

  const compValue = result.comp_value || 0;
  const aiValue = result.ai_investment_value || 0;
  const valueDiff = compValue > 0 ? ((aiValue - compValue) / compValue * 100).toFixed(1) : null;
  const gradeInfo = result.grade && GRADE_WEIGHTS[result.grade] ? GRADE_WEIGHTS[result.grade] : null;
  const gradeTier = gradeInfo ? GRADE_TIER_LABELS[gradeInfo.tier] : null;
  const gradeAdjustedComp = gradeInfo && compValue ? (compValue * gradeInfo.multiplier).toFixed(0) : null;
  const cheapestAvailable = result.cheapest_available || null;
  const cheapestVsComp = cheapestAvailable && compValue > 0
    ? ((cheapestAvailable - compValue) / compValue * 100).toFixed(1)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Hero Card */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8">
        {/* Player & Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{result.player_name}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {[result.card_year, result.card_set, result.variation, result.grade].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full border", rec.bg)}>
            <RecIcon className={cn("w-4 h-4", rec.color)} />
            <span className={cn("text-sm font-semibold", rec.color)}>{rec.label}</span>
          </div>
        </div>

        {/* Score + Values Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          <div className="flex justify-center">
            <ScoreGauge score={result.overall_score} label="Investment Score" />
          </div>

          <div className="space-y-3">
            {/* Raw Comp */}
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-0.5">
                Raw Comp (last sale)
              </p>
              <p className="text-lg font-mono font-bold text-muted-foreground">
                {compValue > 0 ? `$${compValue.toLocaleString()}` : 'N/A'}
              </p>
            </div>
            {/* Cheapest Available */}
            {cheapestAvailable && (
              <div className={cn(
                "rounded-xl p-3 border",
                cheapestAvailable < compValue
                  ? "bg-amber-500/5 border-amber-500/20"
                  : "bg-secondary/50 border-border/50"
              )}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <ShoppingCart className="w-3 h-3 text-muted-foreground" />
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Cheapest Available Now
                  </p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className={cn(
                    "text-lg font-mono font-bold",
                    cheapestAvailable < compValue ? "text-amber-400" : "text-foreground"
                  )}>
                    ${cheapestAvailable.toLocaleString()}
                  </p>
                  {cheapestVsComp && (
                    <span className={cn(
                      "text-xs font-mono",
                      parseFloat(cheapestVsComp) < 0 ? "text-amber-400" : "text-emerald-400"
                    )}>
                      {parseFloat(cheapestVsComp) >= 0 ? '+' : ''}{cheapestVsComp}% vs comp
                    </span>
                  )}
                </div>
                {cheapestAvailable < compValue && (
                  <p className="text-[10px] text-amber-400/80 mt-1">⚠ Cheaper than last sale — suppresses value</p>
                )}
              </div>
            )}

            {/* Grade-Adjusted Comp */}
            {gradeInfo && gradeAdjustedComp && (
              <div className="bg-secondary/80 rounded-xl p-3 border border-border/50">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Shield className="w-3 h-3 text-muted-foreground" />
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Grade-Adjusted ({gradeInfo.multiplier}× {result.grade?.split(' ')[0]})
                  </p>
                  {gradeTier && (
                    <span className={cn("text-[10px] font-mono font-semibold ml-auto", gradeTier.color)}>
                      {gradeTier.label}
                    </span>
                  )}
                </div>
                <p className="text-lg font-mono font-bold text-foreground">
                  ${parseInt(gradeAdjustedComp).toLocaleString()}
                </p>
              </div>
            )}
            {/* AI Value */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-0.5">
                AI Investment Value
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-mono font-bold text-primary">
                  ${aiValue.toLocaleString()}
                </p>
                {valueDiff && (
                  <span className={cn(
                    "text-xs font-mono font-semibold",
                    parseFloat(valueDiff) >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {parseFloat(valueDiff) >= 0 ? '+' : ''}{valueDiff}% vs comp
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-center">
              Value Model
            </p>
            {[
              { label: "Comp Anchor (70%)", pct: 70, color: "bg-muted-foreground/40", textColor: "text-muted-foreground" },
              { label: `Grade ×${gradeInfo?.multiplier || 1}`, pct: gradeInfo ? Math.min((gradeInfo.multiplier / 2.8) * 100, 100) : 0, color: "bg-blue-400", textColor: "text-blue-400" },
              { label: "AI Modifier (±30%)", pct: 30, color: "bg-primary", textColor: "text-primary" },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", item.color)} style={{ width: `${item.pct}%` }} />
                  </div>
                  <span className={cn("text-[10px] font-mono w-24 text-right", item.textColor)}>{item.label}</span>
                </div>
              </div>
            ))}
            {gradeInfo && (
              <div className="bg-secondary/30 rounded-lg p-2 mt-2">
                <p className="text-[10px] font-mono text-muted-foreground text-center">
                  Registry premium: {gradeInfo.registry_premium > 0 ? `+${(gradeInfo.registry_premium * 100).toFixed(0)}%` : 'none'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Summary */}
      {result.analysis_summary && (
        <div className="bg-card border border-border/50 rounded-2xl p-6">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
            AI Investment Analysis
          </h3>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {result.analysis_summary}
          </p>
        </div>
      )}

      {/* Full Attribute Breakdown */}
      <div className="bg-card border border-border/50 rounded-2xl p-6">
        <AttributeBreakdown scores={result.attribute_scores || {}} />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onSave}
          className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Bookmark className="w-4 h-4 mr-2" />
          Save to Portfolio
        </Button>
        <Button
          onClick={onReset}
          variant="outline"
          className="flex-1 h-12 rounded-xl border-border/50"
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          Valuate Another Card
        </Button>
      </div>
    </motion.div>
  );
}