import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowLeft, Bookmark, TrendingUp, TrendingDown, Minus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ScoreGauge from '@/components/valuation/ScoreGauge';
import AttributeBreakdown from '@/components/valuation/AttributeBreakdown';
import { GRADE_WEIGHTS, GRADE_TIER_LABELS } from '@/components/valuation/AttributeCategories';

const REC_CONFIG = {
  strong_buy: { label: 'Strong Buy', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', icon: TrendingUp },
  buy: { label: 'Buy', color: 'text-emerald-300', bg: 'bg-emerald-300/10 border-emerald-300/20', icon: TrendingUp },
  hold: { label: 'Hold', color: 'text-primary', bg: 'bg-primary/10 border-primary/20', icon: Minus },
  sell: { label: 'Sell', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', icon: TrendingDown },
  strong_sell: { label: 'Strong Sell', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', icon: TrendingDown },
};

export default function CardDetail() {
  const { id } = useParams();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    base44.entities.CardValuation.get(id).then(result => {
      setCard(result || null);
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

  const rec = REC_CONFIG[card.flip_vs_hold] || REC_CONFIG.hold;
  const RecIcon = rec.icon;
  const gradeInfo = card.grade && GRADE_WEIGHTS[card.grade] ? GRADE_WEIGHTS[card.grade] : null;
  const gradeTier = gradeInfo ? GRADE_TIER_LABELS[gradeInfo.tier] : null;
  const compValue = card.comp_value || 0;
  const aiValue = card.ai_investment_value || 0;
  const valueDiff = compValue > 0 ? ((aiValue - compValue) / compValue * 100).toFixed(1) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </Link>

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
          <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full border self-start", rec.bg)}>
            <RecIcon className={cn("w-4 h-4", rec.color)} />
            <span className={cn("text-sm font-semibold", rec.color)}>{rec.label}</span>
          </div>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="flex justify-center sm:block">
            <ScoreGauge score={card.overall_score || 0} label="Investment Score" />
          </div>
          <div className="space-y-3 sm:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-secondary/50 rounded-xl p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-0.5">Last Sale (Comp)</p>
                <p className="text-lg font-mono font-bold text-muted-foreground">
                  {compValue > 0 ? `$${compValue.toLocaleString()}` : 'N/A'}
                </p>
              </div>
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
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-0.5">AI Inv. Value</p>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <p className="text-xl font-mono font-bold text-primary">${aiValue.toLocaleString()}</p>
                  {valueDiff && (
                    <span className={cn("text-xs font-mono font-semibold", parseFloat(valueDiff) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {parseFloat(valueDiff) >= 0 ? '+' : ''}{valueDiff}%
                    </span>
                  )}
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
          <AttributeBreakdown scores={card.attribute_scores} />
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