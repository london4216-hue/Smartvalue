import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Minus, ArrowRight, Bookmark,
  Shield, ExternalLink, Gem, AlertTriangle, Zap, ChevronDown, ChevronUp,
  Search, ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import BestBuyModal from './BestBuyModal';
import ValueDriversList from './ValueDriversList';
import ContextualSignals from './ContextualSignals';
import PlayerActivityInsights from './PlayerActivityInsights';
import PopulationReport from './PopulationReport';
import CompEvidence from './CompEvidence';

const REC = {
  strong_buy:  { label: 'Strong Buy',  color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30',  icon: TrendingUp },
  buy:         { label: 'Buy',         color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30',  icon: TrendingUp },
  hold:        { label: 'Hold',        color: 'text-primary',     bg: 'bg-primary/10 border-primary/30',          icon: Minus },
  sell:        { label: 'Sell',        color: 'text-amber-500',   bg: 'bg-amber-500/10 border-amber-500/30',      icon: TrendingDown },
  strong_sell: { label: 'Strong Sell', color: 'text-red-500',     bg: 'bg-red-500/10 border-red-500/30',          icon: TrendingDown },
};

function formatDate(str) {
  if (!str) return '';
  try {
    const m = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(+m[1], +m[2]-1, +m[3]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return str;
  } catch (_) { return str; }
}

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-secondary/30 transition-colors"
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 bg-card border-t border-border/30">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ValuationResult({ result, onSave, onReset }) {
  const [showBestBuy, setShowBestBuy] = useState(false);

  const rec = REC[result.flip_vs_hold] || REC.hold;
  const RecIcon = rec.icon;

  const compValue = result.comp_value || 0;
  const aiValue   = result.ai_investment_value || 0;
  const valueDiff = compValue > 0 ? ((aiValue - compValue) / compValue * 100).toFixed(1) : null;
  const cheapest  = result.cheapest_available || null;
  const cheapestVsAi = cheapest && aiValue > 0 ? ((cheapest - aiValue) / aiValue * 100) : null;

  // Card identity line
  const identityLine = [result.card_year, result.card_set, result.variation, result.grade]
    .filter(Boolean).join(' · ');

  // eBay URLs
  const ebayParts = encodeURIComponent(
    [result.player_name, result.card_year, result.card_set, result.variation,
      result.serial_number ? `/${result.serial_number}` : null, result.grade].filter(Boolean).join(' ')
  );
  const ebaySoldUrl   = `https://www.ebay.com/sch/i.html?_nkw=${ebayParts}&LH_Sold=1&LH_Complete=1`;
  const ebayBuyUrl    = `https://www.ebay.com/sch/i.html?_nkw=${ebayParts}&LH_BIN=1&LH_ItemCondition=1000`;

  // Risk flags
  const isGem       = compValue > 0 && aiValue > 0 && (aiValue - compValue) / compValue >= 1.0;
  const isBust      = result.bust_risk;
  const isTreasure  = result.possible_treasure;
  const overpricedPct = cheapestVsAi;

  // Card attributes for the collapsed section
  const attrs = [
    { label: 'Year',   value: result.card_year },
    { label: 'Set',    value: result.card_set },
    { label: 'Grade',  value: result.grade },
    { label: 'Parallel', value: result.variation },
    { label: 'Serial', value: result.serial_number ? `/${result.serial_number}` : null },
    { label: 'Card #', value: result.card_number },
  ].filter(a => a.value);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-10">

      {/* ═══════════════════════════════════════════════════
          SECTION 1 — CARD IDENTITY (Hero Zone)
      ══════════════════════════════════════════════════════ */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">

        {/* Card Image */}
        {result.image_url && (
          <div className="flex justify-center bg-gradient-to-b from-secondary/60 to-secondary/20 px-6 pt-6 pb-4">
            <img
              src={result.image_url}
              alt={result.player_name}
              className="max-h-64 w-auto object-contain rounded-xl shadow-xl"
            />
          </div>
        )}

        <div className="px-5 py-5 space-y-3">
          {/* Player name + rec badge */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-foreground leading-tight">{result.player_name}</h1>
            <div className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold shrink-0', rec.bg)}>
              <RecIcon className={cn('w-3.5 h-3.5', rec.color)} />
              <span className={rec.color}>{rec.label}</span>
            </div>
          </div>

          {/* Identity line */}
          {identityLine && (
            <p className="text-sm text-muted-foreground font-medium">{identityLine}</p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            {result.is_rookie_year && (
              <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full">🏆 Rookie</span>
            )}
            {result.grade && (
              <span className="inline-flex items-center bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{result.grade}</span>
            )}
            {result.variation && (
              <span className="inline-flex items-center bg-secondary border border-border text-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{result.variation}</span>
            )}
            {result.serial_number && (
              <span className="inline-flex items-center bg-purple-500/10 border border-purple-500/30 text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full">/{result.serial_number}</span>
            )}
            {result._pop_report?.pop_at_grade != null && result.grade && (
              <span className="inline-flex items-center gap-1 bg-orange-500/10 border border-orange-500/30 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Pop {result._pop_report.pop_at_grade}
              </span>
            )}
            {result.color_matches_team && (
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">🎨 Team Color Match</span>
            )}
            {result.has_autograph && (
              <span className="inline-flex items-center bg-blue-500/10 border border-blue-500/30 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {result.is_sticker_auto ? '🏷 Sticker Auto' : '✍️ On-Card Auto'}
              </span>
            )}
          </div>

          {/* Last Sold strip */}
          {compValue > 0 && (
            <div className="flex items-center justify-between bg-secondary/50 border border-border/50 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Closest Sale to Today</span>
                <span className="text-base font-black font-mono text-foreground">${compValue.toLocaleString()}</span>
                {result._comp_sale_date && (
                  <span className="text-xs text-muted-foreground">· {formatDate(result._comp_sale_date)}</span>
                )}
              </div>
              <a href={ebaySoldUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold hover:underline">
                <ExternalLink className="w-2.5 h-2.5" />
                Verify
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          SECTION 2 — VALUE ENGINE (Primary)
      ══════════════════════════════════════════════════════ */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-5">

        {/* AI Value + Rec */}
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AI Smart Value</p>
          <p className="text-6xl font-black font-mono text-primary leading-none">
            ${aiValue.toLocaleString()}
          </p>
          {valueDiff !== null && (
            <p className={cn(
              'text-sm font-semibold',
              parseFloat(valueDiff) >= 0 ? 'text-emerald-500' : 'text-red-400'
            )}>
              {parseFloat(valueDiff) >= 0 ? '+' : ''}{valueDiff}% vs last sale
            </p>
          )}
          {/* Range / Confidence */}
          {result.projections?.one_year && (
            <p className="text-xs text-muted-foreground mt-1">
              12-month target: <span className="font-semibold text-foreground">{result.projections.one_year}</span>
            </p>
          )}
        </div>

        {/* Overpriced / deal band */}
        {cheapest && overpricedPct !== null && (
          <div className={cn(
            'flex items-center justify-between gap-3 rounded-xl border px-4 py-3',
            overpricedPct > 0
              ? 'bg-red-500/5 border-red-500/30'
              : 'bg-emerald-500/5 border-emerald-500/30'
          )}>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Current Asking</p>
              <p className="text-lg font-mono font-bold text-foreground">${cheapest.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className={cn('text-sm font-bold', overpricedPct > 0 ? 'text-red-500' : 'text-emerald-500')}>
                {overpricedPct > 0 ? '⚠️ Overpriced' : '✓ Good Deal'}
              </p>
              <p className={cn('text-xs font-mono', overpricedPct > 0 ? 'text-red-400' : 'text-emerald-400')}>
                {overpricedPct > 0 ? '+' : ''}{overpricedPct.toFixed(1)}% vs AI value
              </p>
            </div>
            <a href={ebayBuyUrl} target="_blank" rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors">
              <ShoppingCart className="w-3 h-3" />
              Buy
            </a>
          </div>
        )}

        {/* Top 5 Value Drivers */}
        {result.value_drivers?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Top Value Drivers</p>
            <ValueDriversList drivers={result.value_drivers} compValue={compValue} />
          </div>
        )}

        {/* Risk alerts — inline, no paragraphs */}
        <div className="space-y-2">
          {isGem && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5">
              <Gem className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-sm font-semibold text-amber-700">Gem Found — AI value 100%+ above last sale</span>
            </div>
          )}
          {isTreasure && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5">
              <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-sm font-semibold text-emerald-700">Possible Treasure — strong upside signals</span>
            </div>
          )}
          {isBust && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-sm font-semibold text-red-700">Bust Risk — multiple bearish flags</span>
            </div>
          )}
        </div>


      </div>

      {/* ═══════════════════════════════════════════════════
          SECTION 3 — SUPPORTING FACTORS (Collapsed)
      ══════════════════════════════════════════════════════ */}

      {/* Market Activity — always expanded */}
      {(result._market_signals?.length > 0 || result._player_activity) && (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/30">
            <span className="text-sm font-semibold text-foreground">📈 Market Activity</span>
          </div>
          <div className="px-5 pb-5 pt-3 space-y-4">
            <PlayerActivityInsights
              playerName={result.player_name}
              cardYear={result.card_year}
              prefetchedData={result._player_activity}
            />
            <ContextualSignals
              playerName={result.player_name}
              cardYear={result.card_year}
              cardSet={result.card_set}
              prefetchedData={result._market_signals}
            />
          </div>
        </div>
      )}

      {/* Comparable Sales */}
      <Accordion title="🔁 Comparable Sales">
        <div className="pt-2 space-y-3">
          <CompEvidence result={result} />
          {result._similar_comps?.length > 0 && (
            <div className="space-y-2">
              {result._similar_comps.slice(0, 3).map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-3 bg-secondary/40 border border-border/40 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{c.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(c.sold_date)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-black font-mono text-foreground">${c.sold_price?.toLocaleString()}</span>
                    {c.item_url && (
                      <a href={c.item_url} target="_blank" rel="noopener noreferrer"
                        className="text-primary hover:opacity-70">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Accordion>

      {/* Card Attributes */}
      {attrs.length > 0 && (
        <Accordion title="🃏 Card Attributes">
          <div className="pt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {attrs.map(a => (
              <div key={a.label} className="bg-secondary/40 border border-border/40 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{a.label}</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{a.value}</p>
              </div>
            ))}
            {result.has_autograph !== undefined && (
              <div className="bg-secondary/40 border border-border/40 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Auto</p>
                <p className="text-sm font-bold text-foreground mt-0.5">
                  {result.has_autograph ? (result.is_sticker_auto ? 'Sticker' : 'On-Card') : 'None'}
                </p>
              </div>
            )}
          </div>

        </Accordion>
      )}

      {/* Risk Flags — only if triggered */}
      {(isBust || isGem || result._comp_anomaly_flag || overpricedPct > 30) && (
        <Accordion title="🚩 Risk Flags" defaultOpen>
          <div className="pt-2 space-y-2">
            {result.bust_risk_text && (
              <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 leading-snug">{result.bust_risk_text}</p>
              </div>
            )}
            {result.possible_treasure_text && (
              <div className="flex items-start gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                <Gem className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700 leading-snug">{result.possible_treasure_text}</p>
              </div>
            )}
            {result._comp_anomaly_flag && result._comp_anomaly_reason && (
              <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-snug">{result._comp_anomaly_reason}</p>
              </div>
            )}
            {overpricedPct > 30 && cheapest && (
              <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                <Shield className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 leading-snug">
                  Asking price ${cheapest.toLocaleString()} is {overpricedPct.toFixed(0)}% above AI value. Avoid or negotiate hard.
                </p>
              </div>
            )}
          </div>
        </Accordion>
      )}

      <BestBuyModal
        isOpen={showBestBuy}
        onClose={() => setShowBestBuy(false)}
        cardData={result}
        aiValue={result.ai_investment_value}
      />

      {/* ═══════════════════════════════════════════════════
          BOTTOM CTA ROW — always visible at end of page
      ══════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={() => setShowBestBuy(true)} variant="outline" className="flex-1 h-10 rounded-xl text-sm">
          <Search className="w-3.5 h-3.5 mr-1.5" />
          Find Best Buy
        </Button>
        <Button onClick={onSave} className="flex-1 h-10 rounded-xl text-sm">
          <Bookmark className="w-3.5 h-3.5 mr-1.5" />
          Save to Portfolio
        </Button>
        <Button onClick={onReset} variant="outline" className="flex-1 h-10 rounded-xl text-sm">
          <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
          New Valuation
        </Button>
      </div>
    </motion.div>
  );
}