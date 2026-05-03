import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ArrowRight, Bookmark, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ScoreGauge from './ScoreGauge';
import AttributeBreakdown from './AttributeBreakdown';

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

          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-xl p-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                Comp Value (Baseline)
              </p>
              <p className="text-xl font-mono font-bold text-muted-foreground">
                {compValue > 0 ? `$${compValue.toLocaleString()}` : 'N/A'}
              </p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-1">
                AI Investment Value
              </p>
              <div className="flex items-baseline gap-3">
                <p className="text-2xl font-mono font-bold text-primary">
                  ${aiValue.toLocaleString()}
                </p>
                {valueDiff && (
                  <span className={cn(
                    "text-xs font-mono font-semibold",
                    parseFloat(valueDiff) >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {parseFloat(valueDiff) >= 0 ? '+' : ''}{valueDiff}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-center">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                Weight Split
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted-foreground/30 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-muted-foreground/60 rounded-full" />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">50%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Comp Baseline</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-primary/30 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-primary rounded-full" />
                </div>
                <span className="text-[10px] font-mono text-primary">50%</span>
              </div>
              <p className="text-[10px] text-primary mt-1">AI Attribute Score</p>
            </div>
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