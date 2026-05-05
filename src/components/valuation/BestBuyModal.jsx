import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, AlertCircle, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function BestBuyModal({ isOpen, onClose, cardData, aiValue }) {
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setIsLoading(true);
    setError('');
    setListings([]);

    try {
      const response = await base44.functions.invoke('findBestBuy', {
        playerName: cardData.player_name,
        cardYear: cardData.card_year,
        cardSet: cardData.card_set,
        grade: cardData.grade,
        aiValue: aiValue
      });

      setListings(response.data.listings || []);
      if (!response.data.listings || response.data.listings.length === 0) {
        setError('No current listings found. Try searching manually on eBay or PWCC.');
      }
    } catch (err) {
      setError('Failed to search listings. Try manually on eBay or PWCC.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>🔍 Find Best Buy</DialogTitle>
        </DialogHeader>

        {!listings.length && !isLoading && !error && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Search live listings on eBay, PWCC, Goldin & COMC to find the best price for this card.
            </p>
            <Button onClick={handleSearch} className="mx-auto">
              Search Now
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-sm text-muted-foreground">Searching live listings...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {listings.length > 0 && (
          <div className="space-y-3">
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-xs font-mono text-muted-foreground">
                AI Fair Value: <span className="text-primary font-bold">${aiValue.toLocaleString()}</span>
              </p>
            </div>

            {listings.map((listing, idx) => {
              const priceDelta = listing.delta_vs_ai;
              const isGoodDeal = listing.is_below_ai;

              return (
                <motion.a
                  key={idx}
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    'block p-4 border rounded-lg hover:border-primary/50 transition-all cursor-pointer',
                    isGoodDeal ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-card border-border/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground mb-1">
                        {listing.seller_name}
                      </p>
                      {listing.grade_match && (
                        <p className="text-xs text-muted-foreground mb-2">
                          Grade Match: <span className="text-foreground font-medium">{listing.grade_match}</span>
                        </p>
                      )}
                      {listing.condition_notes && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {listing.condition_notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className={cn(
                        'text-lg font-bold font-mono',
                        isGoodDeal ? 'text-emerald-500' : 'text-foreground'
                      )}>
                        ${listing.price.toLocaleString()}
                      </p>
                      {priceDelta && (
                        <p className={cn(
                          'text-xs font-mono mt-1',
                          isGoodDeal ? 'text-emerald-500' : 'text-amber-500'
                        )}>
                          {parseFloat(priceDelta) <= 0 ? '✓ ' : ''}{priceDelta}% vs AI
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 mt-3 pt-3 border-t border-border/30">
                    <span className="text-xs text-muted-foreground">View Listing</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </div>
                </motion.a>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}