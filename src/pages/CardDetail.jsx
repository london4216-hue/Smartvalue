import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Minus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ScoreGauge from '@/components/valuation/ScoreGauge';
import AttributeBreakdown from '@/components/valuation/AttributeBreakdown';
import { GRADE_WEIGHTS, GRADE_TIER_LABELS } from '@/components/valuation/AttributeCategories';

const REC_CONFIG = {
  strong_buy: { label: 'Strong Buy', color: 'text-emerald-500', bg: 'bg-emerald-500/15 border-emerald-500/30', icon: TrendingUp, reason: 'Significantly undervalued (>12%)' },
  buy: { label: 'Buy', color: 'text-emerald-400', bg: 'bg-emerald-400/15 border-emerald-400/30', icon: TrendingUp, reason: 'Undervalued (8-12%)' },
  hold: { label: 'Hold', color: 'text-blue-400', bg: 'bg-blue-400/15 border-blue-400/30', icon: Minus, reason: 'Fairly valued (-5% to +8%)' },
  sell: { label: 'Sell', color: 'text-amber-500', bg: 'bg-amber-500/15 border-amber-500/30', icon: TrendingDown, reason: 'Overvalued (-10% to -5%)' },
  strong_sell: { label: 'Strong Sell', color: 'text-red-500', bg: 'bg-red-500/15 border-red-500/30', icon: TrendingDown, reason: 'Significantly overvalued (<-10%)' },
};

/**
 * VALIDATION LOGIC
 */

// Validate that comp price has at least 3 sales
function validateCompPrice(compData) {
  if (!compData) return { valid: false, issues: ['No comp data available'], count: 0, price: 0 };

  const saleCount = compData.sale_count || 1;
  const price = compData.price || 0;

  const issues = [];
  if (saleCount < 3) {
    issues.push(`Only ${saleCount} of 3 recent sales available`);
  }
  if (price <= 0) {
    issues.push('Comp price is invalid or zero');
  }

  return {
    valid: saleCount >= 3 && price > 0,
    issues,
    count: saleCount,
    price,
    hasWarning: saleCount < 3,
  };
}

// Validate AI value deviation (must be within ±15%)
function validateAIDeviation(compPrice, aiValue) {
  if (compPrice <= 0) return { valid: false, deviation: null, issues: ['Invalid comp price'] };

  const deviation = ((aiValue - compPrice) / compPrice) * 100;
  const isWithinBounds = Math.abs(deviation) <= 15;

  const issues = [];
  if (!isWithinBounds) {
    issues.push(`AI value deviates ${Math.abs(deviation).toFixed(1)}% from comp (max allowed: 15%)`);
  }

  return {
    valid: isWithinBounds,
    deviation,
    isOutOfBounds: !isWithinBounds,
    issues,
  };
}

// Generate recommendation based on AI deviation
function getRecommendation(deviation) {
  if (deviation === null || deviation === undefined) return 'hold';

  if (deviation > 12) return 'strong_buy';
  if (deviation >= 8) return 'buy';
  if (deviation >= -5) return 'hold';
  if (deviation >= -10) return 'sell';
  return 'strong_sell';
}

// Calculate data quality score
function getDataQuality(compValidation, deviationValidation) {
  let score = 100;

  if (compValidation.hasWarning) score -= 20;
  if (deviationValidation.isOutOfBounds) score -= 30;

  return Math.max(score, 0);
}

export default function CardDetail() {
  const { id } = useParams();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validations, setValidations] = useState({});

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    base44.entities.CardValuation.get(id).then(result => {
      setCard(result || null);

      if (result) {
        // Run all validations
        const compValidation = validateCompPrice(result.comp_data);
        const deviationValidation = validateAIDeviation(result.comp_value || 0, result.ai_investment_value || 0);

        setValidations({
          comp: compValidation,
          deviation: deviationValidation,
          dataQuality: getDataQuality(compValidation, deviationValidation),
        });
      }

      setLoading(false);
    }).catch(() => {
      setCard(null);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Card not found.</p>
        <Link to="/"><Button variant="outline" className="mt-4">Back to Dashboard</Button></Link>
      </div>
    );
  }

  const compValue = card.comp_value || 0;
  const aiValue = card.ai_investment_value || 0;
  const valueDiff = validations.deviation?.deviation || 0;
  const recommendation = getRecommendation(valueDiff);
  const rec = REC_CONFIG[recommendation];
  const RecIcon = rec.icon;

  const gradeInfo = card.grade && GRADE_WEIGHTS[card.grade] ? GRADE_WEIGHTS[card.grade] : null;
  const gradeTier = gradeInfo ? GRADE_TIER_LABELS[gradeInfo.tier] : null;

  const dataQuality = validations.dataQuality || 100;
  const hasDataIssues = dataQuality < 70;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </Link>

      {/* Data Quality Warning (if issues) */}
      {hasDataIssues && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Data Quality Issue</p>
            <ul className="text-xs text-amber-600/90 dark:text-amber-400/90 mt-1 space-y-0.5 list-disc list-inside">
              {validations.comp?.issues?.map((issue, i) => <li key={i}>{issue}</li>)}
              {validations.deviation?.issues?.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          </div>
        </motion.div>
      )}

      {/* Recommendation Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("rounded-xl p-6 border-2", rec.bg)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <RecIcon className={cn("w-6 h-6 flex-shrink-0 mt-0.5", rec.color)} />
            <div>
              <h2 className={cn("text-2xl font-bold", rec.color)}>{rec.label}</h2>
              <p className="text-sm text-muted-foreground mt-1">{rec.reason}</p>
              <p className={cn("text-sm font-mono font-semibold mt-2", rec.color)}>
                Deviation: {valueDiff >= 0 ? '+' : ''}{valueDiff.toFixed(1)}% from comp value
              </p>
            </div>
          </div>
          <div className={cn("px-3 py-1.5 rounded text-xs font-semibold", rec.color, rec.bg.split(' ')[0])}>
            {dataQuality}% confident
          </div>
        </div>
      </motion.div>

      {/* Hero Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{card.player_name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {[card.card_year, card.card_set, card.variation, card.grade].filter(Boolean).join(' · ')}
            </p>
            {card.card_number && (
              <p className="text-xs text-muted-foreground mt-0.5">Card #{card.card_number}</p>
            )}
          </div>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="flex justify-center sm:block">
            <ScoreGauge score={card.overall_score || 0} label="Investment Score" />
          </div>
          <div className="space-y-3 sm:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Comp Price with validation */}
              <div className={cn(
                "rounded-xl p-3 border",
                validations.comp?.hasWarning
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-secondary/50 border-border/50'
              )}>
                <div className="flex items-center gap-1 mb-0.5">
                  {validations.comp?.hasWarning ? (
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  )}
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Comp Baseline ({validations.comp?.count || 0}/3)
                  </p>
                </div>
                <p className={cn(
                  "text-lg font-mono font-bold",
                  validations.comp?.hasWarning ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                )}>
                  {compValue > 0 ? `$${compValue.toLocaleString()}` : 'N/A'}
                </p>
              </div>

              {/* Grade */}
              {gradeInfo && (
                <div className="bg-secondary/80 rounded-xl p-3 border border-border/50">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Shield className="w-3 h-3 text-muted-foreground" />
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      Grade ×{gradeInfo.multiplier}
                    </p>
                    {gradeTier && <span className={cn("text-[10px] font-mono font-semibold ml-auto", gradeTier.color)}>{gradeTier.label}</span>}
                  </div>
                  <p className="text-lg font-mono font-bold text-foreground">
                    ${Math.round(compValue * gradeInfo.multiplier).toLocaleString()}
                  </p>
                </div>
              )}

              {/* AI Value with deviation validation */}
              <div className={cn(
                "rounded-xl p-3 border",
                validations.deviation?.isOutOfBounds
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-primary/5 border-primary/20'
              )}>
                <div className="flex items-center gap-1 mb-0.5">
                  {validations.deviation?.isOutOfBounds ? (
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  )}
                  <p className={cn(
                    "text-[10px] font-mono uppercase tracking-wider",
                    validations.deviation?.isOutOfBounds ? 'text-red-600 dark:text-red-400' : 'text-primary'
                  )}>
                    AI Inv. Value
                  </p>
                </div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <p className={cn(
                    "text-xl font-mono font-bold",
                    validations.deviation?.isOutOfBounds ? 'text-red-500' : 'text-primary'
                  )}>
                    ${aiValue.toLocaleString()}
                  </p>
                  <span className={cn(
                    "text-xs font-mono font-semibold",
                    valueDiff >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {valueDiff >= 0 ? '+' : ''}{valueDiff.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Analysis */}
      {card.analysis_summary && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border border-border/50 rounded-2xl p-6">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">AI Investment Analysis</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">{card.analysis_summary}</p>
        </motion.div>
      )}

      {/* Attribute Breakdown */}
      {card.attribute_scores && Object.keys(card.attribute_scores).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card border border-border/50 rounded-2xl p-6">
          <AttributeBreakdown scores={card.attribute_scores} baseValue={compValue} />
        </motion.div>
      )}

      {/* Notes */}
      {card.notes && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="bg-card border border-border/50 rounded-2xl p-6">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Notes</h2>
          <p className="text-sm text-foreground/80">{card.notes}</p>
        </motion.div>
      )}
    </div>
  );
}
