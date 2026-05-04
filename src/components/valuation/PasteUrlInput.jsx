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
2. For comp_value: use the SOLD/FINAL SALE price if this is a completed listing. If it's an active listing, look for "sold" comps nearby or the current bid/BIN price.
3. For cheapest_available: use the current asking/BIN price if active listing.
4. NEVER return 0 for comp_value or cheapest_available if any price is visible — use the actual number.
5. Return null only if a value is truly not present anywhere on the page.

Return a JSON object with these exact fields:
- player_name: string (REQUIRED — player's full name)
- card_year: string (e.g. "1986", "2003", "2023")
- card_set: string (e.g. "Topps", "Prizm", "National Treasures")
- card_number: string (e.g. "221", "57")
- variation: string (e.g. "Gold Parallel", "Silver", "Base", "Superfractor")
- grade: string (e.g. "PSA 9", "BGS 10", "Raw" — include grading company)
- comp_value: number (the actual dollar amount paid — NEVER 0 if a price exists)
- cheapest_available: number (current asking price — NEVER 0 if price exists)
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