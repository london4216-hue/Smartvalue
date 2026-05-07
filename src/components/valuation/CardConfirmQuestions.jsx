import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CheckCircle2, X, Loader2 } from 'lucide-react';

/**
 * Pre-valuation confirmation questions — shown after card is identified,
 * before running the AI valuation. Captures 3 crucial value drivers:
 *  1. Auto type (on-card / sticker / no auto)
 *  2. Serial number (yes → enter number / no)
 *  3. Jersey match (yes / no / N/A)
 */
export default function CardConfirmQuestions({ extracted, imagePreview, onConfirm, onWrongCard, cardSummary }) {
  // Auto
  const [autoType, setAutoType] = useState(
    extracted?.has_autograph === false ? 'none'
    : extracted?.is_sticker_auto ? 'sticker'
    : extracted?.has_autograph ? 'on_card'
    : null
  );

  // Serial
  const initialSerial = extracted?.serial_number || null;
  const [isSerial, setIsSerial] = useState(initialSerial ? 'yes' : null);
  const [serialNumber, setSerialNumber] = useState(initialSerial || '');

  // Jersey match
  const [jerseyMatch, setJerseyMatch] = useState(null);

  // Last sold price — auto-fetched via backend, can be overridden
  const [lastSoldPrice, setLastSoldPrice] = useState(extracted?.comp_value || null);
  const [fetchingComp, setFetchingComp] = useState(false);
  const [compError, setCompError] = useState(null);
  
  // Auto-fetch comp on mount
  useEffect(() => {
    if (!lastSoldPrice && !fetchingComp && extracted?.player_name && !compError) {
      fetchComp();
    }
  }, []);
  
  const fetchComp = async () => {
    setFetchingComp(true);
    setCompError(null);
    try {
      const result = await base44.functions.invoke('fetchLiveSoldComps', {
        player_name: extracted.player_name,
        card_year: extracted.card_year || null,
        card_set: extracted.card_set || null,
        grade: extracted.grade || null,
        variation: extracted.variation || null,
      });
      if (result.data?.comp_value && result.data.comp_value > 0) {
        setLastSoldPrice(result.data.comp_value);
      } else {
        setCompError('No recent comps found');
      }
    } catch (err) {
      setCompError('Failed to fetch comp');
    } finally {
      setFetchingComp(false);
    }
  };

  const canConfirm = autoType !== null && isSerial !== null && (isSerial === 'no' || serialNumber.toString().trim() !== '') && jerseyMatch !== null && parseFloat(lastSoldPrice) > 0;

  const handleConfirm = () => {
    const parsedPrice = parseFloat(lastSoldPrice);
    const updates = {
      has_autograph: autoType !== 'none',
      is_sticker_auto: autoType === 'sticker',
      _auto_type_uncertain: false,
      serial_number: isSerial === 'yes' ? serialNumber.toString().trim() : null,
      jersey_match: jerseyMatch === 'yes',
      // Lock in the user-entered comp — never overridden by AI
      comp_value: parsedPrice > 0 ? parsedPrice : null,
      _comp_confidence: parsedPrice > 0 ? 'user_provided' : undefined,
    };
    onConfirm({ ...extracted, ...updates });
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Card image */}
      {(imagePreview || extracted?.image_url) && (
        <div className="w-full bg-gradient-to-b from-secondary/50 to-secondary/20 flex items-center justify-center p-4 border-b border-border/30">
          <img
            src={imagePreview || extracted.image_url}
            alt={cardSummary}
            className="max-h-80 w-auto object-contain rounded-xl shadow-lg"
            style={{ maxWidth: '100%' }}
          />
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Card identity */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
            ✦ AI identified this card — is this correct?
          </p>
          <p className="text-sm font-bold text-foreground leading-snug">{cardSummary}</p>
        </div>

        {/* ── Q1: Auto Type ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground">Q1 — Autograph type?</span>
            <span className="text-[10px] text-red-500 font-semibold ml-auto">Required</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            On-card autos are worth <strong>40–200% more</strong> than sticker autos — critical value driver.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 'on_card', label: '✅ On-Card', sub: 'Signed directly', activeClass: 'bg-emerald-500 border-emerald-500 text-white' },
              { val: 'sticker', label: '🏷️ Sticker', sub: 'Sticker applied', activeClass: 'bg-amber-500 border-amber-500 text-white' },
              { val: 'none', label: '🚫 No Auto', sub: 'Base card', activeClass: 'bg-secondary border-border text-foreground' },
            ].map(({ val, label, sub, activeClass }) => (
              <button
                key={val}
                type="button"
                onClick={() => setAutoType(val)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-lg border-2 text-xs font-semibold transition-all',
                  autoType === val ? activeClass : 'bg-transparent border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                <span>{label}</span>
                <span className={cn('text-[9px] font-normal', autoType === val ? 'opacity-80' : 'text-muted-foreground/60')}>{sub}</span>
              </button>
            ))}
          </div>
          {autoType && autoType !== 'none' && (
            <p className={cn('text-[10px] font-semibold', autoType === 'on_card' ? 'text-emerald-600' : 'text-amber-600')}>
              {autoType === 'on_card' ? '✓ On-card confirmed — premium value applied' : '✓ Sticker auto confirmed — discount applied to AI value'}
            </p>
          )}
        </div>

        {/* ── Q2: Serial Number ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground">Q2 — Is this card serial numbered?</span>
            <span className="text-[10px] text-red-500 font-semibold ml-auto">Required</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            Sometimes not visible in photos or listing description — huge impact on value (e.g. /10 vs /99 vs /249).
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: 'yes', label: '🔢 Yes, it is', activeClass: 'bg-primary border-primary text-white' },
              { val: 'no', label: '❌ No serial', activeClass: 'bg-secondary border-border text-foreground' },
            ].map(({ val, label, activeClass }) => (
              <button
                key={val}
                type="button"
                onClick={() => { setIsSerial(val); if (val === 'no') setSerialNumber(''); }}
                className={cn(
                  'py-2.5 rounded-lg border-2 text-xs font-semibold transition-all',
                  isSerial === val ? activeClass : 'bg-transparent border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {isSerial === 'yes' && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-muted-foreground shrink-0">/</span>
              <input
                type="number"
                placeholder="e.g. 10, 25, 49, 99..."
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                className="flex-1 h-9 px-3 text-sm font-mono border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-[10px] text-muted-foreground">print run</span>
            </div>
          )}
          {isSerial === 'yes' && serialNumber && (
            <p className="text-[10px] font-semibold text-primary">
              ✓ Numbered /{serialNumber} — scarcity score applied
            </p>
          )}
        </div>

        {/* ── Q3: Jersey Match ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground">Q3 — Jersey number match?</span>
            <span className="text-[10px] text-red-500 font-semibold ml-auto">Required</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            If the serial number matches the player's jersey number (e.g. Kobe /24, LeBron /23), collectors pay a significant premium.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 'yes', label: '🏀 Yes — jersey match!', activeClass: 'bg-emerald-500 border-emerald-500 text-white' },
              { val: 'no', label: '❌ No match', activeClass: 'bg-secondary border-border text-foreground' },
              { val: 'na', label: '➖ N/A', activeClass: 'bg-secondary border-border text-foreground' },
            ].map(({ val, label, activeClass }) => (
              <button
                key={val}
                type="button"
                onClick={() => setJerseyMatch(val)}
                className={cn(
                  'py-2.5 rounded-lg border-2 text-xs font-semibold transition-all',
                  jerseyMatch === val ? activeClass : 'bg-transparent border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {jerseyMatch === 'yes' && (
            <p className="text-[10px] font-semibold text-emerald-600">
              ✓ Jersey match premium applied — significant collector value boost
            </p>
          )}
        </div>

        {/* ── Q4: Last Sold Price ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground">Q4 — Last sale price</span>
            {fetchingComp ? (
              <span className="text-[10px] text-primary font-semibold ml-auto flex items-center gap-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Fetching from eBay...
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground ml-auto">Auto-fetched · can edit</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            AI automatically searched for recent sold comps. Edit below if you found a better match on eBay.
          </p>
          
          {/* Price Input */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-muted-foreground shrink-0">$</span>
            <input
              type="number"
              placeholder="Loading..."
              value={lastSoldPrice || ''}
              onChange={e => setLastSoldPrice(parseFloat(e.target.value) || null)}
              className="flex-1 h-9 px-3 text-sm font-mono border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={fetchingComp}
            />
          </div>
          
          {lastSoldPrice && parseFloat(lastSoldPrice) > 0 ? (
            <p className="text-[10px] font-semibold text-emerald-600">
              ✓ ${parseFloat(lastSoldPrice).toLocaleString()} — locked in as comp anchor
            </p>
          ) : compError ? (
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-amber-600">{compError}</p>
              <button
                type="button"
                onClick={fetchComp}
                className="text-[10px] font-semibold text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          ) : fetchingComp ? (
            <p className="text-[10px] text-muted-foreground">Searching eBay sold listings...</p>
          ) : (
            <p className="text-[10px] text-amber-600">⚠ Enter a price to continue</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 h-9 text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            {canConfirm ? 'Run AI Valuation →' : 'Answer all 4 questions above'}
          </Button>
          <Button size="sm" variant="outline" onClick={onWrongCard} className="h-9 text-xs px-3">
            <X className="w-3 h-3 mr-1" />
            Wrong card
          </Button>
        </div>
      </div>
    </div>
  );
}