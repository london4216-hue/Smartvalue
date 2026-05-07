import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle2, AlertTriangle, Clock, Info, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

function ConfidenceBar({ pct }) {
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500';
  const label = pct >= 75 ? 'High Confidence' : pct >= 50 ? 'Medium Confidence' : 'Low Confidence';
  const textColor = pct >= 75 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-400' : 'text-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border/40 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', color)}
        />
      </div>
      <span className={cn('text-[10px] font-bold font-mono w-24 shrink-0', textColor)}>
        {pct}% · {label}
      </span>
    </div>
  );
}

// Compute a confidence score from available signals
function computeConfidence(result) {
  let score = 50; // base
  const conf = result._comp_confidence;
  if (conf === 'user_provided' || conf === 'high') score += 25;
  else if (conf === 'medium') score += 10;
  else if (conf === 'low') score -= 10;
  if (!result.comp_value) score -= 20;

  // Comp age penalty
  if (result._comp_sale_date) {
    const saleDate = new Date(result._comp_sale_date);
    const ageMonths = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (ageMonths <= 3) score += 15;
    else if (ageMonths <= 6) score += 8;
    else if (ageMonths <= 12) score += 0;
    else if (ageMonths <= 24) score -= 10;
    else score -= 25; // >24 months — spec says disqualify
  }

  // Pop report available
  if (result._pop_report?.pop_at_grade) score += 5;
  // Grade present
  if (result.grade) score += 5;
  // Serial number known
  if (result.serial_number) score += 5;

  return Math.max(10, Math.min(98, Math.round(score)));
}

// Detect if comp is >24 months old (spec: hard disqualification)
function getCompAgeWarning(saleDateStr) {
  if (!saleDateStr) return null;
  const saleDate = new Date(saleDateStr);
  if (isNaN(saleDate.getTime())) return null;
  const ageMonths = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (ageMonths > 24) return { months: Math.round(ageMonths), level: 'disqualified' };
  if (ageMonths > 12) return { months: Math.round(ageMonths), level: 'stale' };
  return null;
}

export default function ValuationTransparencyHeader({ result }) {
  const [open, setOpen] = useState(false);
  const compValue = result.comp_value || 0;
  const aiValue = result.ai_investment_value || 0;
  const baseline = compValue > 0 ? (compValue * 0.90) : null;
  const adjustmentDollars = baseline ? (aiValue - baseline) : null;
  const adjustmentPct = baseline ? ((aiValue - baseline) / baseline * 100).toFixed(1) : null;
  const confidence = computeConfidence(result);
  const compAgeWarning = getCompAgeWarning(result._comp_sale_date);
  const now = new Date();
  const updatedStr = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Info className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-bold text-foreground">Base-44 Valuation · 90% Comp Rule</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              Updated {updatedStr}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {/* Confidence pill */}
          <div className={cn(
            "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold font-mono",
            confidence >= 75 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
            confidence >= 50 ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' :
            'bg-red-500/10 border-red-500/30 text-red-500'
          )}>
            <span>{confidence}% confidence</span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {/* Confidence bar — always visible */}
      <div className="px-5 pb-3 -mt-1">
        <ConfidenceBar pct={confidence} />
      </div>

      {/* Comp age warning — spec: >24mo = disqualified */}
      {compAgeWarning && (
        <div className={cn(
          "mx-5 mb-3 flex items-start gap-2 p-3 rounded-lg border text-xs",
          compAgeWarning.level === 'disqualified'
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-amber-400/10 border-amber-400/30 text-amber-400'
        )}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            {compAgeWarning.level === 'disqualified'
              ? <><strong>Comp exceeds 24-month window</strong> ({compAgeWarning.months} months old) — per the Base-44 rule this comp is automatically disqualified. AI Value uses Closest Match Protocol.</>
              : <><strong>Stale comp</strong> ({compAgeWarning.months} months old) — exercise caution. Market conditions may have shifted since this sale.</>
            }
          </div>
        </div>
      )}

      {/* No comp warning */}
      {!compValue && (
        <div className="mx-5 mb-3 flex items-start gap-2 p-3 bg-amber-400/10 border border-amber-400/30 rounded-lg text-xs text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span><strong>No recent comp within 24 months</strong> — using Closest Match Protocol. AI Value is an estimate; treat with additional caution.</span>
        </div>
      )}

      {/* Expandable audit log */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-border/30 space-y-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground pt-3">
                How This Value Was Calculated
              </p>

              {/* Step-by-step audit trail */}
              <div className="space-y-2">
                {/* Step 1 */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-emerald-500">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">Last Sold Comp (Anchor)</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {compValue > 0
                        ? <>Most relevant completed sale: <span className="font-mono text-foreground">${compValue.toLocaleString()}</span>
                           {result._comp_sale_date && <> · {result._comp_sale_date}</>}
                           {' '}· Confidence: <span className="capitalize">{result._comp_confidence || 'unknown'}</span></>
                        : 'No direct comp found within 24 months — Closest Match Protocol applied.'
                      }
                    </p>
                    {result._comp_notes && (
                      <p className="text-[9px] text-muted-foreground/70 mt-0.5 italic">{result._comp_notes}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {compValue > 0
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : <AlertTriangle className="w-4 h-4 text-amber-400" />
                    }
                  </div>
                </div>

                {/* Step 2 */}
                {baseline && (
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-primary">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-foreground">90% Baseline Applied</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        ${compValue.toLocaleString()} × 0.90 = <span className="font-mono text-foreground">${Math.round(baseline).toLocaleString()}</span>
                        {' '}(conservative starting floor per Base-44 rule)
                      </p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  </div>
                )}

                {/* Step 3 */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-primary">3</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">44-Attribute Adjustment Layer</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {adjustmentPct !== null
                        ? <>Net adjustment: <span className={cn("font-mono font-bold", parseFloat(adjustmentPct) >= 0 ? "text-emerald-500" : "text-red-400")}>
                            {parseFloat(adjustmentPct) >= 0 ? '+' : ''}{adjustmentPct}%
                          </span>
                          {adjustmentDollars !== null && <> ({parseFloat(adjustmentDollars) >= 0 ? '+' : ''}${Math.round(adjustmentDollars).toLocaleString()})</>}
                          {' '}· Max allowed: ±10% (Pop-1 exception: up to +25%)
                          </>
                        : 'Attribute adjustments applied from 44-attribute model.'
                      }
                    </p>
                    {/* Top signals */}
                    {result.key_signals?.slice(0, 3).map((sig, i) => (
                      <p key={i} className="text-[9px] text-muted-foreground/70 mt-0.5">
                        {sig.direction === 'bullish' ? '↑' : sig.direction === 'bearish' ? '↓' : '→'} {sig.label}
                        {sig.impact_pct ? ` (${sig.direction === 'bearish' ? '-' : '+'}${sig.impact_pct}%)` : ''}
                      </p>
                    ))}
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>

                {/* Step 4 — Final value */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-primary">4</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">Final AI Investment Value</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      <span className="font-mono font-bold text-primary text-sm">${aiValue.toLocaleString()}</span>
                      {compValue > 0 && <>
                        {' '}· {((aiValue / compValue) * 100).toFixed(1)}% of last sold comp
                        {' '}(valid range: 80–110% unless extreme scarcity)
                      </>}
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>
              </div>

              {/* Confidence factors */}
              <div className="pt-2 border-t border-border/20">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Confidence Factors</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {[
                    { label: 'Comp source', val: result._comp_confidence === 'high' ? '✓ High' : result._comp_confidence === 'user_provided' ? '✓ User verified' : result._comp_confidence === 'medium' ? '~ Medium' : '⚠ Low' },
                    { label: 'Comp age', val: result._comp_sale_date ? (compAgeWarning ? `⚠ ${compAgeWarning.months}mo old` : '✓ Recent') : '? Unknown' },
                    { label: 'Grade data', val: result.grade ? `✓ ${result.grade}` : '? Not graded' },
                    { label: 'Pop report', val: result._pop_report?.pop_at_grade ? `✓ Pop ${result._pop_report.pop_at_grade}` : '⚠ Estimated' },
                    { label: 'Serial', val: result.serial_number ? `✓ /${result.serial_number}` : '— Not serialized' },
                    { label: 'Data model', val: 'Base-44 v1.1' },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between text-[9px] py-0.5">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono text-foreground/80">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[9px] text-muted-foreground/50 leading-relaxed">
                This valuation follows the Base-44 + 90% Comp Rule. AI values are estimates based on available market data and should not be the sole basis for any buy/sell decision. Always verify comps independently before transacting.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}