import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ArrowRight, Bookmark, Shield, ShoppingCart, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ScoreGauge from './ScoreGauge';
import AttributeBreakdown from './AttributeBreakdown';
import KeySignals from './KeySignals';
import ContextualSignals from './ContextualSignals';
import InvestmentThesis from './InvestmentThesis';
import ValuationBreakdown from './ValuationBreakdown';
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
      {/* Investment Thesis — Last Sale vs AI Value */}
      <InvestmentThesis
        compValue={compValue}
        aiValue={aiValue}
        flipVsHold={result.flip_vs_hold}
        cheapestAvailable={cheapestAvailable}
      />

      {/* Key Signals — GOTCHA attributes up top */}
       {result.key_signals && result.key_signals.length > 0 && (
         <KeySignals signals={result.key_signals} flipVsHold={result.flip_vs_hold} />
       )}

      {/* Contextual Market Signals */}
      <ContextualSignals playerName={result.player_name} cardYear={result.card_year} cardSet={result.card_set} />

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
            {/* Last Sale */}
             <div className={`rounded-xl p-3 ${compValue > 0 ? 'bg-secondary/50' : 'bg-amber-500/5 border border-amber-500/20'}`}>
               <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-0.5">
                 Last Sale Price
               </p>
               <p className={`text-lg font-mono font-bold ${compValue > 0 ? 'text-foreground' : 'text-amber-500'}`}>
                 {compValue > 0 ? `$${compValue.toLocaleString()}` : 'Not provided'}
               </p>
               <p className="text-[9px] text-muted-foreground/60 mt-1">
                 {compValue > 0 ? 'What someone actually paid for this card' : '⚠ No comp entered — AI Value based on market knowledge only'}
               </p>
             </div>

            {/* Holder's Comp Projections */}
             {(compValue > 0 || aiValue > 0) && (
               <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                 <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 mb-2">
                   Estimated Future Value
                 </p>
                 <div className="space-y-1.5">
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-muted-foreground">1 Year</span>
                     <span className="font-mono font-bold text-foreground">${((compValue || aiValue) * 1.15).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-muted-foreground">5 Year</span>
                     <span className="font-mono font-bold text-emerald-400">${((compValue || aiValue) * 1.6).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-muted-foreground">10 Year</span>
                     <span className="font-mono font-bold text-emerald-300">${((compValue || aiValue) * 2.7).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                   </div>
                 </div>
               </div>
             )}
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
               <div className="space-y-2">
                 <div>
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
                 <p className="text-[9px] text-primary/70 leading-tight">
                   What this card is worth to a long-term holder based on grade, rarity, player demand & market signals. Accounts for PSA potential, condition, and collector interest.
                 </p>
               </div>
             </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">
                How We Calculate AI Value
              </p>
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2 text-xs text-muted-foreground/80">
                <p>
                  <span className="text-foreground font-semibold">Step 1:</span> Start with what it last sold for (comp)
                </p>
                <p>
                  <span className="text-foreground font-semibold">Step 2:</span> Multiply by grade quality (e.g., PSA 10 = ×2.2)
                </p>
                <p>
                  <span className="text-foreground font-semibold">Step 3:</span> Adjust up/down based on rarity, player demand, autographs, patches (±30%)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Grade Impact
              </p>
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-foreground">{result.grade || 'No Grade'}</span>
                  <span className="text-blue-400 font-semibold">×{gradeInfo?.multiplier || 1}</span>
                </div>
                <p className="text-[10px] text-muted-foreground/70">
                  {gradeInfo?.label || 'Raw card — no grading company premium'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                AI Signals Adjustment
              </p>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground/80">
                  Looking at: serial number, autograph type, patch quality, player momentum, rarity
                </p>
                <p className="text-[10px] text-primary font-semibold mt-1">Can adjust value up to +30% or down to -30%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Where to Buy */}
      <div className="bg-card border border-border/50 rounded-2xl p-6">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
          🛍️ Where to Buy
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href={`https://www.ebay.com/sch/i.html?_nkw=${result.player_name}+${result.card_year}+${result.card_set}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary/50 border border-border/30 hover:border-primary/50 transition-all"
          >
            <span className="text-sm font-semibold text-foreground">eBay</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </a>
          <a
            href={`https://www.pwccauctions.com/Search?searchType=0&searchQuery=${result.player_name}+${result.card_year}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary/50 border border-border/30 hover:border-primary/50 transition-all"
          >
            <span className="text-sm font-semibold text-foreground">PWCC Auctions</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </a>
          <a
            href={`https://www.comc.com/Cards/Search?CardName=${result.player_name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary/50 border border-border/30 hover:border-primary/50 transition-all"
          >
            <span className="text-sm font-semibold text-foreground">COMC</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </a>
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

      {/* Valuation Calculation Breakdown */}
      <ValuationBreakdown 
        compValue={compValue}
        attributeScores={result.attribute_scores || {}}
        aiValue={result.ai_investment_value}
        valueDrivers={result.value_drivers || []}
        holdersCompCalc={result.holders_comp_calculation || null}
      />

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