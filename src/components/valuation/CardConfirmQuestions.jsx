import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CheckCircle2, X } from 'lucide-react';

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

  const canConfirm = autoType !== null && isSerial !== null && (isSerial === 'no' || serialNumber.toString().trim() !== '') && jerseyMatch !== null;

  const handleConfirm = () => {
    const updates = {
      has_autograph: autoType !== 'none',
      is_sticker_auto: autoType === 'sticker',
      _auto_type_uncertain: false,
      serial_number: isSerial === 'yes' ? serialNumber.toString().trim() : null,
      jersey_match: jerseyMatch === 'yes',
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

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 h-9 text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            {canConfirm ? 'Run AI Valuation →' : 'Answer all 3 questions above'}
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