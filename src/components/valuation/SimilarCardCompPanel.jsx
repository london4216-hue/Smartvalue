import { ExternalLink, Search, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatDate(str) {
  if (!str) return '';
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (_) { return str; }
}

export default function SimilarCardCompPanel({ result }) {
  const compType = result._similar_card_comp_type;
  const comp     = result._similar_card_comp;

  // Only show for 1/1 or stale >2yr
  if (!compType || !comp) return null;

  const isOneOfOne = compType === 'one_of_one';
  const isStale    = compType === 'stale_over_2yr';

  const reasonLabel  = isOneOfOne ? '1-of-1 Card — No Direct Comp Exists' : 'Last Sold is Over 2 Years Old';
  const reasonDetail = isOneOfOne
    ? 'This is a 1/1 — by definition no identical card has ever sold. We found the closest similar card from the same set to give you a market anchor.'
    : 'Your last sold data is too old to be a reliable anchor. We found a recent similar card from the same set to help you gauge current market value.';

  const playerLabel = [result.player_name, result.card_year, result.card_set].filter(Boolean).join(' ');

  return (
    <div className="border border-purple-500/30 bg-purple-500/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-purple-500/10 border-b border-purple-500/20 flex items-center gap-2">
        <span className="text-base">🔍</span>
        <div>
          <p className="text-sm font-bold text-purple-700">{reasonLabel}</p>
          <p className="text-xs text-purple-600/80">{reasonDetail}</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-3">
          {/* Your card */}
          <div className="bg-card border border-border/50 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Your Card</p>
            <p className="text-xs font-semibold text-foreground leading-snug">{playerLabel}</p>
            {result.variation && <p className="text-[10px] text-purple-600 font-semibold mt-0.5">{result.variation}</p>}
            {result.serial_number && <p className="text-[10px] text-muted-foreground">/{result.serial_number}</p>}
            {result.grade && <p className="text-[10px] text-primary font-bold mt-0.5">{result.grade}</p>}
            <div className="mt-2 pt-2 border-t border-border/30">
              {result.comp_value ? (
                <>
                  <p className="text-[10px] text-muted-foreground">Last sold (stale)</p>
                  <p className="text-base font-black font-mono text-muted-foreground line-through">${result.comp_value.toLocaleString()}</p>
                  {result._comp_sale_date && <p className="text-[10px] text-muted-foreground">{formatDate(result._comp_sale_date)}</p>}
                </>
              ) : (
                <p className="text-xs text-amber-600 font-semibold">No direct sale found</p>
              )}
            </div>
          </div>

          {/* Similar card */}
          <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Similar Sold Card</p>
            <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{comp.title}</p>
            <div className="mt-2 pt-2 border-t border-emerald-500/20">
              <p className="text-[10px] text-muted-foreground">Recent sale</p>
              <p className="text-base font-black font-mono text-emerald-700">${comp.sold_price.toLocaleString()}</p>
              {comp.sold_date && <p className="text-[10px] text-muted-foreground">{formatDate(comp.sold_date)}</p>}
              {comp.item_url && (
                <a href={comp.item_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 mt-1 text-[10px] text-primary font-semibold hover:underline">
                  <ExternalLink className="w-2.5 h-2.5" />
                  View listing
                </a>
              )}
            </div>
          </div>
        </div>

        {/* AI interpretation */}
        <div className="bg-card border border-border/50 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-foreground mb-1">
            <span className="text-purple-600">🤖 AI Suggested Selling Price / Comp Reference</span>
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Based on the similar card selling at{' '}
            <span className="font-bold text-foreground">${comp.sold_price.toLocaleString()}</span>,
            our AI value of{' '}
            <span className="font-bold text-primary">${(result.ai_investment_value || 0).toLocaleString()}</span>{' '}
            accounts for your card's{' '}
            {result.serial_number === '1' ? '1/1 extreme scarcity premium' :
             result.variation ? `${result.variation} parallel multiplier` :
             result.grade ? `${result.grade} grade` : 'specific attributes'}.
            {isStale ? ' The market may have shifted — treat this as a directional estimate.' : ''}
          </p>
        </div>

        {/* Additional similar sales */}
        {comp.all?.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Other Similar Sales Found</p>
            {comp.all.slice(1).map((c, i) => (
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

      </div>
    </div>
  );
}