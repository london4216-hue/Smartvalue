import { ExternalLink, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatDate(str) {
  if (!str) return '';
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (_) { return str; }
}

function ageDays(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function ageLabel(days) {
  if (days == null) return 'Unknown date';
  if (days <= 30)   return `${days}d ago`;
  if (days <= 365)  return `${Math.round(days / 30)}mo ago`;
  return `${(days / 365).toFixed(1)}yr ago`;
}

// Extract attributes from a listing title for comparison
function extractAttrsFromTitle(title = '') {
  const t = title.toLowerCase();
  const grade = t.match(/psa\s*\d+\.?\d*|bgs\s*\d+\.?\d*|sgc\s*\d+\.?\d*/i)?.[0]?.toUpperCase() || null;
  const isAuto = /auto|autograph|signed/i.test(t);
  const isPatch = /patch|mem|jersey/i.test(t);
  const serial = t.match(/\/(\d+)/)?.[1] || null;
  return { grade, isAuto, isPatch, serial };
}

// Build attribute rows comparing your card vs the similar comp
function buildAttributeRows(result, compTitle = '') {
  const compAttrs = extractAttrsFromTitle(compTitle);
  const rows = [];

  // Brand / Set
  if (result.card_set) {
    const setInComp = compTitle.toLowerCase().includes((result.card_set || '').toLowerCase().split(' ')[0]);
    rows.push({ label: 'Set / Brand', yours: result.card_set, theirs: setInComp ? result.card_set : 'Different set', match: setInComp });
  }

  // Grade
  if (result.grade) {
    const gradeMatch = compAttrs.grade && compAttrs.grade.toLowerCase().replace(/\s+/g, '') === (result.grade || '').toLowerCase().replace(/\s+/g, '');
    rows.push({ label: 'Grade', yours: result.grade, theirs: compAttrs.grade || 'Similar grade', match: gradeMatch });
  }

  // Auto
  if (result.has_autograph) {
    rows.push({ label: 'Autograph', yours: result.is_sticker_auto ? 'Sticker Auto' : 'On-Card Auto', theirs: compAttrs.isAuto ? 'Autograph' : '—', match: compAttrs.isAuto });
  }

  // Patch
  if (result.has_patch) {
    rows.push({ label: 'Patch', yours: 'Yes', theirs: compAttrs.isPatch ? 'Yes' : 'No', match: compAttrs.isPatch });
  }

  // Serial
  if (result.serial_number) {
    const serialMatch = compAttrs.serial != null;
    rows.push({
      label: 'Serialized',
      yours: `/${result.serial_number}`,
      theirs: compAttrs.serial ? `/${compAttrs.serial}` : 'Not serialized',
      match: serialMatch,
    });
  }

  return rows;
}

export default function SimilarCardCompPanel({ result }) {
  const compType = result._similar_card_comp_type;
  const comp     = result._similar_card_comp;

  // Only show for 1/1 or stale >2yr
  if (!compType || !comp) return null;

  const isOneOfOne = compType === 'one_of_one';
  const isStale    = compType === 'stale_over_2yr';

  const staleAgeDays  = result._comp_sale_date ? ageDays(result._comp_sale_date) : null;
  const compAgeDays   = comp.sold_date ? ageDays(comp.sold_date) : null;
  const attrRows      = buildAttributeRows(result, comp.title || '');
  const matchCount    = attrRows.filter(r => r.match).length;
  const matchPct      = attrRows.length > 0 ? Math.round((matchCount / attrRows.length) * 100) : null;

  const headerLabel  = isOneOfOne ? '1-of-1 — No Identical Card Has Ever Sold' : 'Last Sold Is Over 2 Years Old';
  const headerDetail = isOneOfOne
    ? 'By definition this card has no direct comp. We found the closest similar card to anchor the AI value.'
    : `Your most recent sale is ${staleAgeDays ? Math.round(staleAgeDays / 365 * 10) / 10 + 'yr' : 'over 2yr'} old. We found a recent similar card to give you a current market anchor.`;

  return (
    <div className="border border-purple-500/30 bg-purple-500/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-purple-500/10 border-b border-purple-500/20 flex items-start gap-2.5">
        <span className="text-base shrink-0 mt-0.5">🔍</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-purple-700">{headerLabel}</p>
          <p className="text-xs text-purple-600/80 leading-snug mt-0.5">{headerDetail}</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ── STALE: show original last sold with "stale" badge ── */}
        {isStale && result.comp_value && (
          <div className="flex items-center justify-between gap-3 bg-amber-500/8 border border-amber-500/30 rounded-xl px-4 py-3">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Clock className="w-3 h-3 text-amber-500" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Original Last Sold (Stale)</p>
              </div>
              <p className="text-xl font-black font-mono text-muted-foreground line-through">${result.comp_value.toLocaleString()}</p>
              {result._comp_sale_date && (
                <p className="text-[10px] text-amber-600 mt-0.5">
                  {formatDate(result._comp_sale_date)} · {staleAgeDays ? `${Math.round(staleAgeDays / 365 * 10) / 10}yr ago` : ''}  — too old to rely on
                </p>
              )}
            </div>
            {(result.last_sold_url || result._ebay_search_url) && (
              <a href={result.last_sold_url || result._ebay_search_url} target="_blank" rel="noopener noreferrer"
                className="shrink-0 text-[10px] text-amber-600 font-semibold hover:underline inline-flex items-center gap-0.5">
                <ExternalLink className="w-2.5 h-2.5" />
                View
              </a>
            )}
          </div>
        )}

        {/* ── SIDE-BY-SIDE COMPARISON ── */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Side-by-Side Comp Comparison</p>
          <div className="grid grid-cols-2 gap-3">

            {/* Your card */}
            <div className="bg-card border-2 border-primary/30 rounded-xl p-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Your Card</p>
              <p className="text-xs font-bold text-foreground leading-snug">
                {[result.player_name, result.card_year, result.card_set].filter(Boolean).join(' ')}
              </p>
              {result.variation && (
                <span className="inline-block text-[10px] bg-purple-500/10 text-purple-700 border border-purple-500/20 px-1.5 py-0.5 rounded font-semibold">
                  {result.variation}
                </span>
              )}
              {result.serial_number && (
                <p className="text-[10px] font-bold text-purple-600">/{result.serial_number}</p>
              )}
              {result.grade && (
                <p className="text-[10px] font-bold text-primary">{result.grade}</p>
              )}
              <div className="pt-1.5 border-t border-border/30">
                {isOneOfOne ? (
                  <p className="text-[10px] text-amber-600 font-semibold italic">No direct comp exists</p>
                ) : (
                  <>
                    <p className="text-[10px] text-muted-foreground">Stale last sold</p>
                    <p className="text-base font-black font-mono text-muted-foreground line-through">${result.comp_value?.toLocaleString() || '—'}</p>
                    {result._comp_sale_date && <p className="text-[10px] text-muted-foreground">{formatDate(result._comp_sale_date)}</p>}
                  </>
                )}
              </div>
            </div>

            {/* Similar card anchor */}
            <div className="bg-emerald-500/5 border-2 border-emerald-500/40 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Closest Comp Found</p>
                {matchPct !== null && (
                  <span className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded-full border',
                    matchPct >= 80 ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' :
                    matchPct >= 50 ? 'text-amber-600 bg-amber-500/10 border-amber-500/30' :
                    'text-muted-foreground bg-secondary border-border'
                  )}>
                    {matchPct}% attr match
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground leading-snug line-clamp-3">{comp.title}</p>
              <div className="pt-1.5 border-t border-emerald-500/20">
                <p className="text-[10px] text-muted-foreground">Recent sold price</p>
                <p className="text-base font-black font-mono text-emerald-700">${comp.sold_price.toLocaleString()}</p>
                {comp.sold_date && (
                  <p className="text-[10px] text-muted-foreground">{formatDate(comp.sold_date)} · {compAgeDays ? ageLabel(compAgeDays) : ''}</p>
                )}
                {comp.item_url && (
                  <a href={comp.item_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 mt-1 text-[10px] text-emerald-600 font-semibold hover:underline">
                    <ExternalLink className="w-2.5 h-2.5" />
                    Verify on eBay
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── ATTRIBUTE MATCH TABLE ── */}
        {attrRows.length > 0 && (
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Attribute Comparison</p>
            <div className="border border-border/40 rounded-xl overflow-hidden">
              <div className="grid grid-cols-3 bg-secondary/60 px-3 py-1.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Attribute</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-primary">Your Card</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Comp Card</p>
              </div>
              {attrRows.map((row, i) => (
                <div key={i} className={cn(
                  'grid grid-cols-3 px-3 py-2 border-t border-border/20 items-center',
                  i % 2 === 0 ? 'bg-card' : 'bg-secondary/20'
                )}>
                  <p className="text-[10px] font-semibold text-muted-foreground">{row.label}</p>
                  <p className="text-[10px] font-bold text-foreground">{row.yours}</p>
                  <div className="flex items-center gap-1">
                    {row.match
                      ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      : <XCircle className="w-3 h-3 text-amber-400 shrink-0" />
                    }
                    <p className={cn('text-[10px] font-semibold', row.match ? 'text-emerald-600' : 'text-amber-600')}>
                      {row.theirs}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AI VALUE INTERPRETATION ── */}
        <div className="bg-card border border-border/50 rounded-xl px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">🤖 AI Value Derivation</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Closest comp sold for{' '}
            <span className="font-bold text-foreground">${comp.sold_price.toLocaleString()}</span>
            {comp.sold_date ? ` on ${formatDate(comp.sold_date)}` : ''}. AI value of{' '}
            <span className="font-bold text-primary">${(result.ai_investment_value || 0).toLocaleString()}</span>{' '}
            {isOneOfOne
              ? `applies a 1/1 extreme scarcity premium on top of this comp — only one copy will ever exist.`
              : `adjusts from this comp for your card's${result.variation ? ` ${result.variation} parallel` : ''}${result.grade ? ` ${result.grade} grade` : ''} and current market conditions.`
            }
            {isStale ? ' Market may have shifted since the original sale — treat as directional.' : ''}
          </p>
        </div>

        {/* ── ADDITIONAL SIMILAR SALES ── */}
        {comp.all?.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Other Recent Similar Sales</p>
            {comp.all.slice(1, 5).map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 bg-secondary/30 border border-border/30 rounded-lg px-3 py-2">
                <p className="text-xs text-foreground truncate flex-1">{c.title || 'Similar card'}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-foreground">${c.sold_price?.toLocaleString()}</span>
                  {c.sold_date && <span className="text-[10px] text-muted-foreground">{formatDate(c.sold_date)}</span>}
                  {c.item_url && (
                    <a href={c.item_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-70">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-2.5 bg-amber-500/8 border border-amber-500/20 rounded-lg">
          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700 leading-snug">
            {isOneOfOne
              ? 'This is a reference comp only — a 1/1 will ultimately sell for what the market will bear. Use as a floor estimate.'
              : 'Stale comp used as a directional reference only. Search eBay sold listings for the most current pricing.'
            }
          </p>
        </div>

      </div>
    </div>
  );
}