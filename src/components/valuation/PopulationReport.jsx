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

export default function PopulationReport({ playerName, grade, cardYear, cardSet, prefetchedData, certNumber }) {
  const [loading, setLoading] = useState(!prefetchedData && !!playerName && !!grade);
  const [popData, setPopData] = useState(prefetchedData || null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (prefetchedData) {
      // Always fetch live data instead of relying on AI-estimated prefetched data
      if (playerName && grade) {
        const fetchPopReport = async () => {
          try {
            const response = await base44.functions.invoke('getPopulationReport', {
              player_name: playerName,
              card_year: cardYear || '',
              card_set: cardSet || '',
              grade: grade,
              cert_number: certNumber || null,
            });
            setPopData({ ...response.data, grade_requested: grade });
          } catch (_) {
            // Fall back to prefetched AI estimate
            setPopData({ ...prefetchedData, grade_requested: grade, _is_estimated: true });
          } finally {
            setLoading(false);
          }
        };
        fetchPopReport();
        return;
      }
      setPopData({ ...prefetchedData, grade_requested: grade, _is_estimated: true });
      setLoading(false);
      return;
    }
    if (!playerName || !grade) { setLoading(false); return; }

    const fetchPopReport = async () => {
      try {
        const response = await base44.functions.invoke('getPopulationReport', {
          player_name: playerName,
          card_year: cardYear || '',
          card_set: cardSet || '',
          grade: grade,
          cert_number: certNumber || null,
        });
        setPopData({ ...response.data, grade_requested: grade });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPopReport();
  }, [playerName, grade, cardYear, cardSet, prefetchedData]);

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
  const gradeLabel = popData.grade_requested || grade || '';
  const isPopOne = popAtGrade === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("border rounded-xl overflow-hidden", isPopOne ? "border-violet-500/50" : config.bg)}
    >
      {/* POP 1 HERO BANNER */}
      {isPopOne && (
        <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-5 py-4 flex items-center gap-3">
          <span className="text-3xl">💎</span>
          <div className="flex-1">
            <p className="text-white font-black text-lg tracking-tight">1 of 1 — The Only Copy</p>
            <p className="text-violet-200 text-xs font-medium mt-0.5">
              Only <strong>1</strong> {gradeLabel} exists across ALL grading companies. This is the rarest possible version of this card at this grade.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-4xl font-black text-white font-mono">1</p>
            <p className="text-violet-300 text-[10px] uppercase tracking-wider">pop</p>
          </div>
        </div>
      )}

      <div className={cn("p-5", isPopOne && "bg-violet-500/5")}>
        {/* Header (non-pop-1) */}
        {!isPopOne && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <p className={cn("text-xs font-mono uppercase tracking-wider font-bold", config.color)}>
                Population Report
              </p>
              <p className={cn("text-sm font-bold capitalize", config.color)}>
                {popData.scarcity_assessment.replace(/_/g, ' ')} — {gradeLabel}
              </p>
            </div>
          </div>
        )}

        {/* Pop 1 sub-header */}
        {isPopOne && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">💎</span>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider font-bold text-violet-500">Population Report</p>
              <p className="text-sm font-bold text-violet-400">Ultra Rare — 1/1 at {gradeLabel}</p>
            </div>
          </div>
        )}

        {/* Pop Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className={cn("rounded-lg p-2.5 border", isPopOne ? "bg-violet-500/15 border-violet-500/40" : "bg-secondary/40 border-border/30")}>
            <p className="text-[10px] text-muted-foreground/70 mb-1">Pop @ {gradeLabel}</p>
            <p className={cn("text-2xl font-mono font-black", isPopOne ? "text-violet-400" : "text-foreground")}>
              {popAtGrade.toLocaleString()}
            </p>
            {totalPop > 0 && !isPopOne && (
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                {((popAtGrade / totalPop) * 100).toFixed(1)}% of total
              </p>
            )}
            {isPopOne && <p className="text-[9px] text-violet-400/80 mt-0.5">Only one exists</p>}
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
        {!isPopOne && (
          <div className="text-xs text-foreground/80 leading-relaxed mb-3">
            <p>
              {popAtGrade > 1 && popAtGrade <= 5 && `Only ${popAtGrade} copies graded at this elite level.`}
              {popAtGrade > 5 && popAtGrade <= 20 && `${popAtGrade} copies exist at this grade—very scarce.`}
              {popAtGrade > 20 && "Solid pop at this grade—still desirable but not ultra-rare."}
            </p>
          </div>
        )}

        {/* Pop 1 value callout */}
        {isPopOne && (
          <div className="flex items-start gap-2 p-3 bg-violet-500/15 border border-violet-500/40 rounded-lg mb-3">
            <span className="text-base shrink-0">🏆</span>
            <div>
              <p className="text-xs font-bold text-violet-400 mb-0.5">Extreme Scarcity Premium</p>
              <p className="text-[10px] text-violet-300/90 leading-snug">
                With only <strong>1</strong> copy at {gradeLabel}, this card commands a dramatic scarcity premium. No direct comp exists at this grade — comparable sales at lower grades significantly undervalue this slab.
              </p>
            </div>
          </div>
        )}

        {/* Grading Opportunity (non-pop-1, low pop) */}
        {!isPopOne && popAtGrade <= 15 && totalPop > 0 && (
          <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <span className="text-base shrink-0">🏆</span>
            <div>
              <p className="text-xs font-bold text-emerald-500 mb-0.5">Grading Opportunity</p>
              <p className="text-[10px] text-emerald-600/90 leading-snug">
                Only <strong>{popAtGrade}</strong> {popData.grade_requested} copies exist across PSA, BGS & SGC. Low population = strong grading upside.
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
                <strong>{popAtGrade.toLocaleString()}</strong> copies already graded at this level. Heavy supply compresses premiums.
              </p>
            </div>
          </div>
        )}

      {/* Confidence Note */}
      <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border/20">
        <AlertCircle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[9px] text-amber-300/80">
          {popData._is_estimated || popData.source_confidence === 'low'
            ? "⚠ AI-estimated figures — not verified live data. Confirm at PSA Registry, BGS Pop Report, or SGC before making decisions."
            : popData.source_confidence === 'medium'
            ? "⚠ Approximate figures from web search. Verify at the official grader registry for exact counts."
            : "Data sourced from web search. Always confirm at the official PSA/BGS/SGC registry."}
        </p>
      </div>

      {popData.notes && (
        <p className="text-[9px] text-muted-foreground/70 mt-2 italic">{popData.notes}</p>
      )}
      </div>
    </motion.div>
  );
}