import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Link as LinkIcon, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PasteUrlInput({ onCardExtracted }) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState(null); // pending confirmation

  const handleExtract = async () => {
    if (!url.trim()) {
      setError('Please paste a URL');
      return;
    }

    setIsLoading(true);
    setError('');
    setExtracted(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `TASK: Extract sports card details from this listing URL and find the last sold comp price.

URL: ${url}

YOU MUST DO ALL THREE STEPS:

STEP 1 — VISIT THIS URL RIGHT NOW AND READ IT:
Open: ${url}
Read the full page title and item description. The title will contain the player name, year, set, parallel/variation, serial number (like /75 or /10), and grade. Extract ALL of it.

STEP 2 — GET THE LISTING PRICE:
The price shown on the active listing = cheapest_available (what the seller is asking).

STEP 3 — FIND REAL SOLD COMPS:
Search for: [player name] [year] [set] [variation] [serial] [grade] sold eBay completed
Also search 130point.com and cardladder.com.
comp_value = the price a BUYER PAID in a completed transaction. Must differ from cheapest_available.

RETURN THIS JSON:
{
  "player_name": "Full Player Name",
  "card_year": "2021",
  "card_set": "Prizm",
  "card_number": "123",
  "variation": "Silver Prizm",
  "serial_number": "75" (just the number, no slash — null if not serialized),
  "grade": "PSA 10" or "Raw",
  "comp_value": 250 (last sold price — number, not string),
  "cheapest_available": 299 (current asking price — number, not string),
  "is_rookie_year": true/false,
  "color_matches_team": true/false,
  "has_autograph": true/false,
  "has_patch": true/false,
  "player_popularity": "rising" or "peak" or "legend" or "declining"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            player_name: { type: "string" },
            card_year: { type: "string" },
            card_set: { type: "string" },
            card_number: { type: "string" },
            variation: { type: "string" },
            serial_number: { type: "string" },
            grade: { type: "string" },
            comp_value: { type: "number" },
            cheapest_available: { type: "number" },
            is_rookie_year: { type: "boolean" },
            color_matches_team: { type: "boolean" },
            has_autograph: { type: "boolean" },
            has_patch: { type: "boolean" },
            player_popularity: { type: "string" },
          },
        },
        add_context_from_internet: true,
        model: 'gemini_3_1_pro',
      });

      if (result.player_name && result.player_name !== 'Unknown') {
        // Show confirmation step instead of immediately proceeding
        setExtracted(result);
      } else {
        setError("Couldn't read this listing. Try copying the full eBay item URL (ebay.com/itm/...) or enter the card details manually below.");
      }
    } catch (err) {
      setError("Couldn't read this listing. Try copying the full eBay item URL or enter the card details manually below.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    onCardExtracted(extracted);
    setUrl('');
    setExtracted(null);
  };

  const handleCancel = () => {
    // Pre-fill what was extracted but let user correct it via the manual form
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
              }}
              onKeyPress={(e) => e.key === 'Enter' && !extracted && handleExtract()}
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
                  <Button size="sm" variant="outline" onClick={handleCancel} className="h-8 text-xs px-3">
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