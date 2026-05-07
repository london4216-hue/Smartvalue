import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const SCARCITY_CONFIG = {
  ultra_rare: { color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30', icon: '💎' },
  very_rare: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: '✨' },
  rare: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: '⭐' },
  uncommon: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: '📊' },
  common: { color: 'text-muted-foreground', bg: 'bg-secondary/50 border-border/30', icon: '📋' }
};

export default function PopulationReport({ playerName, grade, cardYear, cardSet }) {
  const [loading, setLoading] = useState(true);
  const [popData, setPopData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPopReport = async () => {
      if (!playerName || !grade) {
        setLoading(false);
        return;
      }

      try {
        const response = await base44.functions.invoke('getPopulationReport', {
          player_name: playerName,
          card_year: cardYear || '',
          card_set: cardSet || '',
          grade: grade,
        });
        setPopData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPopReport();
  }, [playerName, grade, cardYear, cardSet]);

  if (loading) {
    return (
      <div className="bg-secondary/50 border border-border/30 rounded-xl p-4 flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground">Fetching population data...</span>
      </div>
    );
  }

  if (error || !popData) {
    return null;
  }

  const config = SCARCITY_CONFIG[popData.scarcity_assessment] || SCARCITY_CONFIG.common;
  const popPct = popData.pop_percentage || 0;
  const popAtGrade = popData.pop_at_grade || 0;
  const totalPop = popData.total_pop_all_grades || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("border rounded-xl p-5", config.bg)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{config.icon}</span>
        <div>
          <p className={cn("text-xs font-mono uppercase tracking-wider font-bold", config.color)}>
            Population Report
          </p>
          <p className={cn("text-sm font-bold capitalize", config.color)}>
            {popData.scarcity_assessment.replace(/_/g, ' ')} — {popData.grade_requested}
          </p>
        </div>
      </div>

      {/* Pop Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-[10px] text-muted-foreground/70 mb-1">Pop @ This Grade</p>
          <p className="text-lg font-mono font-bold text-foreground">{popAtGrade.toLocaleString()}</p>
          {totalPop > 0 && (
            <p className="text-[9px] text-muted-foreground/60 mt-0.5">
              {popPct.toFixed(1)}% of total
            </p>
          )}
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground/70 mb-1">Total Pop (All Grades)</p>
          <p className="text-lg font-mono font-bold text-foreground">{totalPop.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground/60 mt-0.5">PSA + BGS + SGC</p>
        </div>

        {popData.highest_grade_achieved && (
          <div>
            <p className="text-[10px] text-muted-foreground/70 mb-1">Highest Grade</p>
            <p className="text-lg font-mono font-bold text-foreground">{popData.highest_grade_achieved}</p>
          </div>
        )}
      </div>

      {/* Grader Breakdown */}
      {popData.grader_breakdown && (
        <div className="mb-4 pb-4 border-b border-border/20">
          <p className="text-[10px] text-muted-foreground mb-2 uppercase font-mono">Grader Breakdown</p>
          <div className="flex gap-3">
            {Object.entries(popData.grader_breakdown).map(([grader, count]) => (
              <div key={grader} className="text-center">
                <p className="text-xs font-semibold text-foreground">{grader}</p>
                <p className="text-sm font-mono font-bold text-primary">{count || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scarcity Insight */}
      <div className="text-xs text-foreground/80 leading-relaxed mb-3">
        <p>
          {popAtGrade === 1 && "This is a one-of-one at this grade—the rarest possible copy."}
          {popAtGrade > 1 && popAtGrade <= 5 && `Only ${popAtGrade} copies graded at this elite level.`}
          {popAtGrade > 5 && popAtGrade <= 20 && `${popAtGrade} copies exist at this grade—very scarce.`}
          {popAtGrade > 20 && "Solid pop at this grade—still desirable but not ultra-rare."}
        </p>
      </div>

      {/* Grading Opportunity / Saturation Callout */}
      {popAtGrade <= 15 && totalPop > 0 && (
        <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <span className="text-base shrink-0">🏆</span>
          <div>
            <p className="text-xs font-bold text-emerald-500 mb-0.5">Grading Opportunity</p>
            <p className="text-[10px] text-emerald-600/90 leading-snug">
              Only <strong>{popAtGrade}</strong> {popData.grade_requested} copies exist across PSA, BGS & SGC. Low population = strong grading upside. A gem mint slab could command a serious premium in this thin market.
            </p>
          </div>
        </div>
      )}
      {popAtGrade > 200 && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <span className="text-base shrink-0">⚠️</span>
          <div>
            <p className="text-xs font-bold text-amber-500 mb-0.5">High Population — Saturated Grade</p>
            <p className="text-[10px] text-amber-600/90 leading-snug">
              <strong>{popAtGrade.toLocaleString()}</strong> copies already graded at this level. Heavy supply compresses premiums — grading fees may not be justified unless your card is a borderline PSA 10.
            </p>
          </div>
        </div>
      )}

      {/* Confidence Note */}
      {popData.source_confidence === 'low' && (
        <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border/20">
          <AlertCircle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[9px] text-amber-300/80">
            Low confidence data. Population reports may be incomplete or outdated. Use as a guide only.
          </p>
        </div>
      )}

      {popData.notes && (
        <p className="text-[9px] text-muted-foreground/70 mt-2 italic">{popData.notes}</p>
      )}
    </motion.div>
  );
}