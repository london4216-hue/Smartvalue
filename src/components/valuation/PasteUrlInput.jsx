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
        prompt: `You are a sports card data extractor. Extract basketball card details from this listing URL: ${url}

CRITICAL INSTRUCTIONS:
1. Visit the URL and extract ALL available data from the listing page.
2. DISTINGUISH between asking price vs sold price:
   - "comp_value" = the most recent ACTUAL SOLD price for this exact card (same player, set, grade). Search your knowledge of recent eBay/PWCC sold comps. This is NOT the listing price.
   - "cheapest_available" = the current asking/listing price on this page (what the seller wants). Use the price shown on the listing.
3. If the listing is an ACTIVE (unsold) listing: cheapest_available = the listed price. For comp_value, use your knowledge of recent real sold prices for this card.
4. If the listing is a COMPLETED/SOLD listing: comp_value = the final sale price. cheapest_available = null.
5. NEVER set comp_value = cheapest_available unless the listing explicitly shows both as the same transaction.
6. NEVER return 0 — use null if a value is truly unknown.

Example: A BGS 9.5 LeBron 2003 Topps Chrome Refractor listed for $30,000 → cheapest_available=30000, comp_value=[research real recent sold price, e.g. $27000-$35000 range from your knowledge].

Return a JSON object with these exact fields:
- player_name: string (REQUIRED — player's full name)
- card_year: string (e.g. "1986", "2003", "2023")
- card_set: string (e.g. "Topps Chrome", "Prizm", "National Treasures")
- card_number: string (e.g. "221", "57")
- variation: string (e.g. "Refractor", "Gold Parallel", "Silver", "Base", "Superfractor")
- grade: string (e.g. "PSA 9", "BGS 9.5", "Raw" — include grading company)
- comp_value: number (most recent REAL SOLD price — NOT the listing price)
- cheapest_available: number (current asking/listing price on this page)
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