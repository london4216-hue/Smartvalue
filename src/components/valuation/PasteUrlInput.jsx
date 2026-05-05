import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PasteUrlInput({ onCardExtracted }) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExtract = async () => {
    if (!url.trim()) {
      setError('Please paste a URL');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a sports card data extractor. Your job is to extract card details AND find the real last sold price.

LISTING URL: ${url}

STEP 1 — READ THE LISTING PAGE:
Visit the URL above. Extract all card details (player, year, set, card number, variation, grade, serial number, listing price).

STEP 2 — DETERMINE LISTING TYPE:
- Is this an ACTIVE listing (still for sale, Buy It Now or auction not ended)? → The price shown is the ASKING price, NOT a sold price.
- Is this a COMPLETED/SOLD listing (shows "Sold" badge, final price)? → That price IS the last sold comp.

STEP 3 — FIND THE REAL LAST SOLD COMP (MANDATORY — DO NOT SKIP):
THIS IS THE MOST CRITICAL STEP. You MUST actively search for real eBay completed/sold listings.

DO THIS NOW:
1. Search Google for: site:ebay.com "[player name] [year] [set] [variation]" sold completed
2. Also search: "[player name] [set] [variation] [serial e.g. /75] sold eBay"
3. Check eBay's completed listings filter directly for this card
4. Look at 130point.com, cardladder.com, or pwccmarketplace.com for recent sales data

The card in the URL has specific identifiers (player, set, year, serial number, grade). Use ALL of them to find the most recent actual sale price.

Recent sales are almost always findable. A "last sold" price of null is a FAILURE unless the card has literally never sold before (extremely rare for an active listing). If someone is selling it, it has comps.

⚠️ CRITICAL RULES:
- comp_value = the price a buyer ACTUALLY PAID in a completed transaction. NEVER the listing/asking price.
- cheapest_available = the current listing price on this active listing (what the seller asks NOW)
- These MUST be different numbers. If identical → you made an error, search harder.
- Setting comp_value = null when real sold data exists is a critical failure. Search aggressively.
- NEVER set comp_value = cheapest_available

Return JSON with these fields:
- player_name: string (full name)
- card_year: string
- card_set: string  
- card_number: string
- variation: string (include serial number if present, e.g. "/75", "1/1")
- grade: string (e.g. "Raw", "PSA 9", "BGS 9.5")
- comp_value: number or null (REAL last sold price from a completed transaction — NOT the listing price)
- cheapest_available: number or null (current asking price on this listing)
- is_rookie_year: boolean
- color_matches_team: boolean
- has_autograph: boolean
- has_patch: boolean
- player_popularity: string ("rising" | "peak" | "legend" | "declining")`,
        response_json_schema: {
          type: "object",
          properties: {
            player_name: { type: "string" },
            card_year: { type: "string" },
            card_set: { type: "string" },
            card_number: { type: "string" },
            variation: { type: "string" },
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

      if (result.player_name) {
        onCardExtracted(result);
      } else {
        setError('Could not extract card details from this URL. Try a more specific listing page.');
      }
    } catch (err) {
      setError('Failed to extract card details. Please try another URL.');
    } finally {
      setUrl('');
      setIsLoading(false);
    }
  };

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
          <div className="flex gap-2">
            <Input
              placeholder="https://www.ebay.com/itm/... or https://www.pwccauctions.com/..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError('');
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleExtract()}
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
        </div>
      </div>
    </motion.div>
  );
}