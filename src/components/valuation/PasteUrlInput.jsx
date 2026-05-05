import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Link as LinkIcon, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Detect eBay short links from iOS/Android app Share sheet
function isEbayShortLink(url) {
  return /^https?:\/\/ebay\.us\//i.test(url.trim());
}

// Detect bare eBay item links — no slug, no keywords (web Share button or copy from app)
function isBareEbayItemLink(url) {
  const t = url.trim();
  // bare: /itm/DIGITS only (no slug, no query string with real keywords)
  if (!/\/itm\/\d+/.test(t)) return false;
  // Has a keyword-rich query string? Not bare.
  if (/_skw=/.test(t) || /[?&]q=/.test(t)) return false;
  // Has a title slug in the path? Not bare.
  const pathMatch = t.match(/\/itm\/([^?#]+)/);
  if (pathMatch && pathMatch[1].includes('-')) return false; // slug present = keywords in path
  return true;
}

export default function PasteUrlInput({ onCardExtracted }) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [urlWarning, setUrlWarning] = useState(null); // null | 'bare' | 'short'

  const handleExtract = async () => {
    if (!url.trim()) {
      setError('Please paste a URL');
      return;
    }

    setIsLoading(true);
    setError('');
    setExtracted(null);

    try {
      // Use backend function — it fetches the real page HTML then runs LLM
      const response = await base44.functions.invoke('extractCardFromUrl', { url: url.trim() });
      const result = response.data;

      if (result?.error) {
        if (isEbayShortLink(url)) {
          setError("Couldn't follow this short link. Open the listing in your browser and copy the full URL from the address bar.");
        } else if (isBareEbayItemLink(url)) {
          setError("Couldn't identify the card from this bare link. Open the listing in your browser — the address bar URL has extra keywords that help us identify the card.");
        } else {
          setError("Couldn't read this listing. Try the full URL from your browser's address bar, or enter card details manually below.");
        }
        return;
      }

      if (result?.player_name && result.player_name !== 'Unknown') {
        setExtracted(result);
      } else {
        if (isEbayShortLink(url) || isBareEbayItemLink(url)) {
          setError("Couldn't identify the card from this link. Open the listing in your browser and copy the full URL from the address bar — it usually contains the card name and keywords.");
        } else {
          setError("Couldn't identify the card. Try the full URL from your browser's address bar, or enter card details manually below.");
        }
      }
    } catch (err) {
      setError("Couldn't read this listing. Try the full URL from your browser's address bar, or enter card details manually below.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    onCardExtracted(extracted);
    setUrl('');
    setExtracted(null);
  };

  const handleWrongCard = () => {
    if (extracted) {
      onCardExtracted({ ...extracted, _needs_correction: true });
    }
    setExtracted(null);
    setError('');
    setUrl('');
  };

  const cardSummary = extracted ? [
    extracted.player_name,
    extracted.card_year,
    extracted.card_set,
    extracted.variation,
    extracted.serial_number ? `/${extracted.serial_number}` : null,
    extracted.grade,
  ].filter(Boolean).join(' · ') : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-1 bg-primary/5 border border-primary/20 rounded-xl p-4"
    >
      <div className="flex items-start gap-3">
        <LinkIcon className="w-5 h-5 text-primary mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-2">Quick Link Paste</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Paste a card listing URL from eBay, PWCC, Goldin, or any card site to auto-fill details.
          </p>

          {/* URL Input */}
          <div className="flex gap-2">
            <Input
              placeholder="https://www.ebay.com/itm/... or https://www.pwccauctions.com/..."
              value={url}
              onChange={(e) => {
                const v = e.target.value;
                setUrl(v);
                setError('');
                setExtracted(null);
                if (isEbayShortLink(v)) setUrlWarning('short');
                else if (isBareEbayItemLink(v)) setUrlWarning('bare');
                else setUrlWarning(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && !extracted && !isLoading && handleExtract()}
              disabled={isLoading}
              className="text-sm"
            />
            <Button
              onClick={handleExtract}
              disabled={isLoading || !url.trim()}
              className="shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Submit'
              )}
            </Button>
          </div>

          {/* URL warning banners */}
          {urlWarning === 'short' && !isLoading && !extracted && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600"
            >
              <p className="font-semibold mb-0.5">📱 eBay app short link</p>
              <p>We'll try to follow this link automatically. If it fails, open the listing in your browser and copy the full address-bar URL instead.</p>
            </motion.div>
          )}

          {isLoading && (
            <p className="text-[11px] text-muted-foreground mt-2 animate-pulse">
              Fetching listing, analyzing card image for grade projection & searching for sold comps…
            </p>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-2 text-xs text-red-500"
            >
              <AlertCircle className="w-3 h-3" />
              {error}
            </motion.div>
          )}

          {/* Confirmation step — Card Visual Preview */}
          <AnimatePresence>
            {extracted && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-3 bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Card Image */}
                {extracted.image_url && (
                  <div className="w-full bg-secondary/30 flex items-center justify-center p-3">
                    <img
                      src={extracted.image_url}
                      alt={cardSummary}
                      className="max-h-64 w-auto object-contain rounded-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Card Details */}
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                      ✦ AI identified this card — is this correct?
                    </p>
                    <p className="text-sm font-bold text-foreground leading-snug">{cardSummary}</p>
                  </div>

                  {/* AI Centering & Cornering Feedback */}
                  {extracted.ai_grade_assessment && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="font-semibold text-primary text-sm mb-2">📐 Centering & Cornering</p>
                      {extracted.eye_appeal_reasoning && (
                        <p className={cn(
                          "text-sm font-medium leading-snug mb-3",
                          extracted.eye_appeal_reasoning.includes('excellent') || extracted.eye_appeal_reasoning.includes('sharp') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        )}>
                          {extracted.eye_appeal_reasoning}
                        </p>
                      )}
                      {extracted.ai_eye_appeal_grade && (
                        <div className="inline-flex items-center gap-2 mb-2">
                          <span className="text-xs text-muted-foreground">Appeal Grade:</span>
                          <div className={cn(
                            "inline-flex items-center justify-center rounded-full w-12 h-12 text-xl font-bold border-2",
                            extracted.ai_eye_appeal_grade === 'A' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' :
                            extracted.ai_eye_appeal_grade === 'B' ? 'bg-blue-500/10 border-blue-500 text-blue-500' :
                            extracted.ai_eye_appeal_grade === 'C' ? 'bg-amber-500/10 border-amber-500 text-amber-500' :
                            'bg-red-500/10 border-red-500 text-red-500'
                          )}>
                            {extracted.ai_eye_appeal_grade}
                          </div>
                        </div>
                      )}
                      {extracted.ai_grade_assessment.key_observations && extracted.ai_grade_assessment.key_observations.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5 font-semibold">Observations:</p>
                          <ul className="text-xs text-foreground/80 space-y-0.5 ml-3 list-disc">
                            {extracted.ai_grade_assessment.key_observations.slice(0, 2).map((obs, idx) => (
                              <li key={idx}>{obs}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pricing */}
                  {(extracted.comp_value || extracted.cheapest_available) && (
                    <div className="p-2.5 bg-secondary/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        {extracted.comp_value ? `💰 Last sold: $${extracted.comp_value.toLocaleString()}` : ''}
                        {extracted.comp_value && extracted.cheapest_available ? ' · ' : ''}
                        {extracted.cheapest_available ? `Ask: $${extracted.cheapest_available.toLocaleString()}` : ''}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={handleConfirm} className="flex-1 h-8 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1.5" />
                      Yes, correct
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleWrongCard} className="h-8 text-xs px-3">
                      <X className="w-3 h-3 mr-1" />
                      Wrong — fix it
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}