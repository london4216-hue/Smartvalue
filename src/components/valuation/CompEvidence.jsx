import { motion } from 'framer-motion';
import { ExternalLink, Search, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIER_CONFIG = {
  exact_match: {
    label: 'Exact Comp Found',
    icon: '✅',
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/5 border-emerald-500/20',
    description: 'Direct sold listing match for this card.',
  },
  adjusted_comp: {
    label: 'Adjusted Comp',
    icon: '🔄',
    color: 'text-blue-500',
    bg: 'bg-blue-500/5 border-blue-500/20',
    description: 'No exact match — closest comparable sale, adjusted for grade or serial difference.',
  },
  similar_card_baseline: {
    label: 'Baseline from 3 Similar Cards',
    icon: '📊',
    color: 'text-amber-500',
    bg: 'bg-amber-500/5 border-amber-500/30',
    description: 'No direct comp found. Three similar cards establish a market baseline. Actual card value adjusts upward for rarity.',
  },
  no_comp_conservative_estimate: {
    label: 'Conservative Asset Estimate',
    icon: '⚠️',
    color: 'text-red-400',
    bg: 'bg-red-500/5 border-red-500/30',
    description: 'No comparable sales data found. AI built a conservative estimate from market knowledge, set prestige, player demand, and scarcity.',
  },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr; // fallback: show as-is
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CompEvidence({ result }) {
  const tier = result._comp_tier;
  const ebayLink = result._comp_ebay_link;
  const similarComps = result._similar_comps || [];
  const notes = result._comp_notes;
  const conservativeReasoning = result._conservative_estimate_reasoning;
  const compValue = result.comp_value;

  // Nothing to show
  if (!tier && !similarComps.length && !notes) return null;

  const config = TIER_CONFIG[tier] || TIER_CONFIG.adjusted_comp;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('border rounded-2xl p-5 space-y-4', config.bg)}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn('text-sm font-bold', config.color)}>{config.label}</p>
            {compValue && (
              <span className="text-xs font-mono font-semibold text-foreground bg-secondary/80 px-2 py-0.5 rounded border border-border/50">
                Anchor: ${compValue.toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{config.description}</p>
        </div>
      </div>

      {/* Exact match — link to listing */}
      {(tier === 'exact_match' || tier === 'adjusted_comp') && (
        <div className="space-y-2">
          {result._comp_sale_date && (
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-semibold">${compValue?.toLocaleString()}</span>
              {result._comp_sale_date ? ` · Sold ${formatDate(result._comp_sale_date)}` : ''}
            </p>
          )}
          {ebayLink && (
            <a
              href={ebayLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              View sold listing
            </a>
          )}
          {notes && (
            <p className="text-xs text-muted-foreground/80 leading-relaxed border-t border-border/20 pt-2 mt-2">
              {notes}
            </p>
          )}
        </div>
      )}

      {/* Similar card baseline — 3 comp cards */}
      {tier === 'similar_card_baseline' && similarComps.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            3 Similar Sold Comps Used as Baseline
          </p>
          <div className="space-y-2">
            {similarComps.map((comp, i) => (
              <div
                key={i}
                className="bg-card border border-border/50 rounded-xl p-3 flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-snug">{comp.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {comp.source} · {formatDate(comp.sale_date)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-bold text-foreground">${comp.sold_price?.toLocaleString()}</p>
                  {comp.ebay_link && (
                    <a
                      href={comp.ebay_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>Baseline note:</strong> These similar cards establish the floor. The actual card's value adjusts <strong>upward</strong> from this baseline based on its rarity, serial number, and scarcity premium applied by the AI.
            </p>
          </div>
          {notes && (
            <p className="text-xs text-muted-foreground/80 leading-relaxed border-t border-border/20 pt-2">
              {notes}
            </p>
          )}
        </div>
      )}

      {/* No comp — conservative estimate methodology */}
      {tier === 'no_comp_conservative_estimate' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 leading-relaxed font-medium">
              No comparable sales found. AI value is a conservative estimate — treat with caution. This is a starting point only; actual market price will be determined at auction.
            </p>
          </div>
          {conservativeReasoning && (
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Conservative Estimate Methodology</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{conservativeReasoning}</p>
            </div>
          )}
          {notes && (
            <p className="text-xs text-muted-foreground/80 leading-relaxed border-t border-border/20 pt-2">
              {notes}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}