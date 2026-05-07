import { motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ArrowRight, Bookmark, Shield, ShoppingCart, ExternalLink, Gem, AlertTriangle, Zap, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ScoreGauge from './ScoreGauge';
import BestBuyModal from './BestBuyModal';
import AttributeBreakdown from './AttributeBreakdown';
import AttributeImpactView from './AttributeImpactView';
import KeySignals from './KeySignals';
import ContextualSignals from './ContextualSignals';
import InvestmentThesis from './InvestmentThesis';
import ValuationBreakdown from './ValuationBreakdown';
import CompEvidence from './CompEvidence';
import PlayerActivityInsights from './PlayerActivityInsights';
import PopulationReport from './PopulationReport';
import DeepDiveAttributes from './DeepDiveAttributes';
import { GRADE_WEIGHTS, GRADE_TIER_LABELS } from './AttributeCategories';

const RECOMMENDATION_CONFIG = {
  strong_buy: { label: 'Strong Buy', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', icon: TrendingUp },
  buy: { label: 'Buy', color: 'text-emerald-300', bg: 'bg-emerald-300/10 border-emerald-300/20', icon: TrendingUp },
  hold: { label: 'Hold', color: 'text-primary', bg: 'bg-primary/10 border-primary/20', icon: Minus },
  sell: { label: 'Sell', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', icon: TrendingDown },
  strong_sell: { label: 'Strong Sell', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', icon: TrendingDown },
};

export default function ValuationResult({ result, onSave, onReset }) {
  const [showBestBuy, setShowBestBuy] = useState(false);
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

  // Calculate gem/run alerts
  const isGem = compValue > 0 && aiValue > 0 && ((aiValue - compValue) / compValue) >= 1.0;
  const isRun = cheapestAvailable && compValue > 0 && ((cheapestAvailable - compValue) / compValue) < -0.30 && aiValue < compValue;

  // Overpriced warning: cheapest available vs AI value
  const cheapestVsAi = cheapestAvailable && aiValue > 0
    ? ((cheapestAvailable - aiValue) / aiValue * 100)
    : null;
  const getOverpricedWarning = (pct) => {
    if (pct === null || pct <= 0) return null;
    if (pct <= 5)   return { label: 'Slightly Overpriced',   color: 'text-yellow-500',  bg: 'bg-yellow-500/10 border-yellow-500/30',  icon: '⚠️', tip: 'Asking price is marginally above AI fair value. Minor negotiation may close the gap.' };
    if (pct <= 15)  return { label: 'Overpriced',             color: 'text-orange-400',  bg: 'bg-orange-400/10 border-orange-400/30',  icon: '⚠️', tip: 'Seller is asking noticeably more than AI fair value. Watch for price drops or seek competing listings.' };
    if (pct <= 30)  return { label: 'Significantly Overpriced', color: 'text-red-400',   bg: 'bg-red-400/10 border-red-400/30',        icon: '🚨', tip: 'Asking price meaningfully exceeds AI fair value. Strong-arm a counteroffer or pass — better deals likely exist.' };
    return           { label: 'Severely Overpriced',           color: 'text-red-500',    bg: 'bg-red-500/10 border-red-500/40',        icon: '🚨', tip: 'Asking price is dramatically above what the market and AI data support. Avoid unless unique circumstances justify the premium.' };
  };
  const overpricedWarning = getOverpricedWarning(cheapestVsAi);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Price Comparison Banner — Always visible at top */}
      {cheapestAvailable && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "border rounded-2xl p-5 flex items-center justify-between gap-4",
            cheapestAvailable > aiValue 
              ? "bg-red-500/10 border-red-500/40" 
              : "bg-emerald-500/10 border-emerald-500/30"
          )}
        >
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">
              Current Asking Price
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-mono font-bold text-foreground">
                ${cheapestAvailable.toLocaleString()}
              </p>
              <p className={cn(
                "text-sm font-mono font-bold",
                cheapestAvailable > aiValue ? "text-red-500" : "text-emerald-500"
              )}>
                {cheapestAvailable > aiValue ? '+' : ''}{cheapestVsAi.toFixed(1)}% vs AI value
              </p>
            </div>
          </div>
          {cheapestAvailable > aiValue && (
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-red-500">⚠️ Overpriced</p>
              <p className="text-sm text-red-600 mt-0.5">Above fair value</p>
            </div>
          )}
          {cheapestAvailable <= aiValue && (
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-emerald-500">✓ Good Deal</p>
              <p className="text-sm text-emerald-600 mt-0.5">Below AI value</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Overpriced Warning — At the top */}
      {overpricedWarning && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className={`border rounded-2xl p-5 flex gap-4 items-start ${overpricedWarning.bg}`}>
          <span className="text-xl shrink-0 mt-0.5">{overpricedWarning.icon}</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className={`text-sm font-bold ${overpricedWarning.color}`}>{overpricedWarning.label}</p>
              <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full border ${overpricedWarning.bg} ${overpricedWarning.color}`}>
                +{cheapestVsAi.toFixed(1)}% above AI value
              </span>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{overpricedWarning.tip}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Asking ${cheapestAvailable.toLocaleString()} · AI Fair Value ${aiValue.toLocaleString()}
            </p>
          </div>
        </motion.div>
      )}

      {/* Investment Thesis — Last Sale vs AI Value */}
      <InvestmentThesis
        compValue={compValue}
        aiValue={aiValue}
        flipVsHold={result.flip_vs_hold}
        cheapestAvailable={cheapestAvailable}
      />

      {/* Comp Evidence — source proof for the anchor price */}
      <CompEvidence result={result} />

      {/* Dollar Waterfall — HOW the AI value was built */}
      <ValuationBreakdown
        compValue={compValue}
        aiValue={result.ai_investment_value}
        valueDrivers={result.value_drivers || []}
        holdersCompCalc={result.holders_comp_calculation || null}
      />

      {/* Player Activity Intelligence — Real-time stats & news */}
      <PlayerActivityInsights playerName={result.player_name} cardYear={result.card_year} />

      {/* Population Report — Scarcity intel */}
      <PopulationReport 
        playerName={result.player_name}
        grade={result.grade}
        cardYear={result.card_year}
        cardSet={result.card_set}
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
            <p className="text-base text-muted-foreground mt-1">
              {[result.card_year, result.card_set, result.variation, result.grade].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full border", rec.bg)}>
            <RecIcon className={cn("w-4 h-4", rec.color)} />
            <span className={cn("text-sm font-semibold", rec.color)}>{rec.label}</span>
          </div>
        </div>

        {/* Score + Values Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <div className="flex flex-col items-center justify-center gap-4">
            <ScoreGauge score={result.overall_score} label="Investment Score" />

            {/* Eye Appeal Grade Badge */}
            {result.ai_eye_appeal_grade && (
              <div className="flex flex-col items-center gap-2">
                <div className={cn(
                  "flex items-center justify-center rounded-full w-20 h-20 text-4xl font-bold border-2",
                  result.ai_eye_appeal_grade === 'A' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' :
                  result.ai_eye_appeal_grade === 'B' ? 'bg-blue-500/10 border-blue-500 text-blue-500' :
                  result.ai_eye_appeal_grade === 'C' ? 'bg-amber-500/10 border-amber-500 text-amber-500' :
                  'bg-red-500/10 border-red-500 text-red-500'
                )}>
                  {result.ai_eye_appeal_grade}
                </div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Eye Appeal Grade
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {/* Last Sale */}
             <div className={`rounded-xl p-3 border ${compValue > 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/30'}`}>
               <div className="flex items-center justify-between mb-1">
                 <p className="text-xs font-semibold text-muted-foreground">
                   Last Sold (90% Anchor)
                 </p>
                 {compValue > 0 && (
                   <span className={cn(
                     "text-xs font-mono px-1.5 py-0.5 rounded border",
                     result._comp_confidence === 'high' ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' :
                     result._comp_confidence === 'user_provided' ? 'text-primary border-primary/30 bg-primary/10' :
                     'text-amber-400 border-amber-400/30 bg-amber-400/10'
                   )}>
                     {result._comp_confidence === 'user_provided' ? '✓ User Entered' :
                      result._comp_confidence === 'high' ? '✓ High Confidence' :
                      result._comp_confidence === 'medium' ? '~ Medium Confidence' : '⚠ Low Confidence'}
                   </span>
                 )}
               </div>
               {compValue > 0 ? (
                 <>
                   <p className="text-2xl font-mono font-bold text-emerald-500">${compValue.toLocaleString()}</p>
                   <p className="text-xs text-muted-foreground mt-1">
                     What someone actually paid · {result._comp_sale_date ? (() => { const d = result._comp_sale_date; const parts = d.match(/(\d{4})-(\d{2})-(\d{2})/); return parts ? new Date(+parts[1], +parts[2]-1, +parts[3]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : d; })() : 'Most recent completed sale'}
                   </p>
                 </>
               ) : (
                 <>
                   <p className="text-lg font-mono font-bold text-red-400">No comp found</p>
                   <p className="text-xs text-red-400 mt-1">
                     ⚠ AI searched but could not find a real completed sale. AI Value is estimated from market knowledge only — treat with caution.
                   </p>
                 </>
               )}
             </div>

            {/* AI-Driven Projections */}
             {result.projections && (result.projections.one_year || result.projections.three_year || result.projections.five_year) && (
               <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                 <p className="text-xs font-semibold text-emerald-600 mb-2">
                   Projected Value Range
                 </p>
                 <div className="space-y-1.5">
                   {result.projections.one_year && (
                     <div className="flex justify-between items-center text-sm">
                       <span className="text-muted-foreground">1 Year</span>
                       <span className="font-mono font-bold text-foreground">{result.projections.one_year}</span>
                     </div>
                   )}
                   {result.projections.three_year && (
                     <div className="flex justify-between items-center text-sm">
                       <span className="text-muted-foreground">3 Year</span>
                       <span className="font-mono font-bold text-emerald-400">{result.projections.three_year}</span>
                     </div>
                   )}
                   {result.projections.five_year && (
                     <div className="flex justify-between items-center text-sm">
                       <span className="text-muted-foreground">5 Year</span>
                       <span className="font-mono font-bold text-emerald-300">{result.projections.five_year}</span>
                     </div>
                   )}
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
                  <p className="text-xs font-semibold text-muted-foreground">
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
                  <p className="text-xs text-amber-500 mt-1">⚠ Cheaper than last sale — suppresses value</p>
                )}
              </div>
            )}

            {/* Grade-Adjusted Comp */}
            {gradeInfo && gradeAdjustedComp && (
              <div className="bg-secondary/80 rounded-xl p-3 border border-border/50">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Shield className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">
                    Grade-Adjusted ({gradeInfo.multiplier}× {result.grade?.split(' ')[0]})
                  </p>
                  {gradeTier && (
                    <span className={cn("text-xs font-semibold ml-auto", gradeTier.color)}>
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
                   <p className="text-xs font-semibold text-primary mb-0.5">
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
                 {/* Pro Tip */}
                 <div className="mt-2 pt-2 border-t border-primary/15 flex items-start gap-1.5">
                   <span className="text-[10px] shrink-0">💡</span>
                   <p className="text-[9px] text-primary/60 leading-tight">
                     <strong className="text-primary/80">Pro Tip:</strong> Check the Population Report below — low PSA/BGS pop at this grade = rare opportunity to grade and flip at a premium. High pop = saturated, harder to stand out.
                   </p>
                 </div>
               </div>
             </div>
          </div>


        </div>
      </div>



      {/* GEM ALERT: Value 100%+ over comp */}
      {isGem && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-5 flex gap-4 items-start">
          <span className="text-3xl shrink-0 mt-0.5">💎</span>
          <div>
            <p className="text-sm font-bold text-amber-400 mb-1">Found a Gem</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              AI value is <strong>100%+ above</strong> last sale price. This card has massive upside potential based on market signals, rarity, and player demand. Strong buy if you believe in the thesis.
            </p>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Last Sale: ${compValue.toLocaleString()} → AI Value: ${aiValue.toLocaleString()} (+{valueDiff}%)
            </p>
          </div>
        </motion.div>
      )}

      {/* RUN ALERT: Massive discount + falling value */}
      {isRun && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/40 rounded-2xl p-5 flex gap-4 items-start">
          <span className="text-3xl shrink-0 mt-0.5">🚩</span>
          <div>
            <p className="text-sm font-bold text-red-400 mb-1">Run From It</p>
            <p className="text-sm text-red-700 leading-relaxed">
              Cheapest available is <strong>30%+ below</strong> last sale, AND AI value doesn't justify buying. Market has cooled significantly. Avoid unless you're speculating on a reversal.
            </p>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Last Sale: ${compValue.toLocaleString()} → Current Ask: ${cheapestAvailable.toLocaleString()} ({cheapestVsComp}%)
            </p>
          </div>
        </motion.div>
      )}

      {/* Possible Treasure Found Alert */}
      {result.possible_treasure && result.possible_treasure_text && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-5 flex gap-4 items-start">
          <Gem className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-emerald-400 mb-1">Possible Treasure Found</p>
            <p className="text-sm text-emerald-700 leading-relaxed">{result.possible_treasure_text}</p>
          </div>
        </motion.div>
      )}

      {/* Bust Risk Alert */}
      {result.bust_risk && result.bust_risk_text && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/40 rounded-2xl p-5 flex gap-4 items-start">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-400 mb-1">Bust Risk</p>
            <p className="text-sm text-red-700 leading-relaxed">{result.bust_risk_text}</p>
          </div>
        </motion.div>
      )}

      {/* Trader Recommendation + Liquidity */}
      {(result.trader_recommendation || result.liquidity_score) && (
        <div className="bg-card border border-border/50 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {result.trader_recommendation && (
            <div className="flex gap-3 items-start">
              <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Trader Recommendation</p>
                <p className="text-sm text-foreground leading-relaxed">{result.trader_recommendation}</p>
              </div>
            </div>
          )}
          {result.liquidity_score && (
            <div className="flex gap-3 items-start">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Liquidity Score</p>
                <p className="text-sm text-foreground leading-relaxed capitalize">{result.liquidity_score}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analysis Summary */}
      {result.analysis_summary && (
        <div className="bg-card border border-border/50 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-foreground mb-3">
            AI Investment Analysis
          </h3>
          <p className="text-base text-foreground/85 leading-relaxed">
            {result.analysis_summary}
          </p>
        </div>
      )}

      {/* Attribute Impact View — Why This Price? */}
      {result.attribute_impact_view?.categories && (
        <AttributeImpactView 
          categories={result.attribute_impact_view.categories}
          imageUrl={result.image_url}
          eyeAppealGrade={result.ai_eye_appeal_grade}
          eyeAppealReasoning={result.eye_appeal_reasoning}
          aiGradeAssessment={result.ai_grade_assessment}
        />
      )}

      {/* Deep Dive — score additional attributes in rounds of 5 */}
      {result.other_attributes?.length > 0 && (
        <DeepDiveAttributes result={result} />
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => setShowBestBuy(true)}
          variant="outline"
          className="flex-1 h-12 rounded-xl border-border/50"
        >
          <Search className="w-4 h-4 mr-2" />
          Find Best Buy
        </Button>
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

      <BestBuyModal
        isOpen={showBestBuy}
        onClose={() => setShowBestBuy(false)}
        cardData={result}
        aiValue={result.ai_investment_value}
      />
    </motion.div>
  );
}