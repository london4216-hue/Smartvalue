import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Link as LinkIcon, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Detect eBay "share" links — bare item ID with no keywords
function isBareEbayShareLink(url) {
  return /^https?:\/\/(www\.)?ebay\.com\/itm\/\d+\s*$/.test(url.trim());
}

export default function PasteUrlInput({ onCardExtracted }) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [bareShareWarning, setBareShareWarning] = useState(false);

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
        if (isBareEbayShareLink(url)) {
          setError("eBay's short share links don't include enough info. Open the listing in your browser and copy the full URL from the address bar — it will have extra details after the item number.");
        } else {
          setError("Couldn't read this listing. Try the full URL from your browser's address bar, or enter card details manually below.");
        }
        return;
      }

      if (result?.player_name && result.player_name !== 'Unknown') {
        setExtracted(result);
      } else {
        if (isBareEbayShareLink(url)) {
          setError("Short eBay share links don't contain enough card info. Open the listing in your browser and copy the full URL from the address bar.");
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
      className="mb-6 bg-primary/5 border border-primary/20 rounded-xl p-4"
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
                setUrl(e.target.value);
                setError('');
                setExtracted(null);
                setBareShareWarning(isBareEbayShareLink(e.target.value));
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

          {/* Bare share link warning */}
          {bareShareWarning && !isLoading && !extracted && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600"
            >
              <p className="font-semibold mb-0.5">⚠️ eBay Share link detected</p>
              <p>Short share links often don't work. For best results, open the eBay listing in your browser and copy the full URL from the address bar — it should contain extra keywords after the item number.</p>
            </motion.div>
          )}

          {isLoading && (
            <p className="text-[11px] text-muted-foreground mt-2 animate-pulse">
              Fetching listing & searching for sold comps…
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

          {/* Confirmation step */}
          <AnimatePresence>
            {extracted && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-3 bg-card border border-border rounded-xl p-3"
              >
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                  ✦ AI identified this card — is this correct?
                </p>
                <p className="text-sm font-semibold text-foreground leading-snug">{cardSummary}</p>
                {(extracted.comp_value || extracted.cheapest_available) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {extracted.comp_value ? `Last sold: $${extracted.comp_value.toLocaleString()}` : ''}
                    {extracted.comp_value && extracted.cheapest_available ? ' · ' : ''}
                    {extracted.cheapest_available ? `Ask: $${extracted.cheapest_available.toLocaleString()}` : ''}
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleConfirm} className="flex-1 h-8 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1.5" />
                    Yes, correct
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleWrongCard} className="h-8 text-xs px-3">
                    <X className="w-3 h-3 mr-1" />
                    Wrong — fix it below
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}