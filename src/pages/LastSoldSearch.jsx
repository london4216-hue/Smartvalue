import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Search, ExternalLink, Loader2, AlertCircle, CheckCircle2, Calendar, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LastSoldSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState([]);
  const [searchUrl, setSearchUrl] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [apifyToken, setApifyToken] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('apify_token');
    if (saved) setApifyToken(saved);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setListings([]);
    setSearchUrl('');

    try {
      const res = await base44.functions.invoke('searchSoldListings', {
        query: query.trim(),
        apify_token: apifyToken,
      });

      const data = res.data;
      if (data.error) {
        setError(data.error);
        return;
      }

      setListings(data.listings || []);
      setSearchUrl(data.search_url || '');
      setSource(data.source || '');

      // Save to database
      if (data.listings?.length > 0) {
        await base44.entities.SoldListing.bulkCreate(data.listings);
      }

      if (!data.listings?.length) {
        setError('No sold listings found for this search. Try a broader search term.');
      }
    } catch (err) {
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const mostRecent = listings.find(l => l.is_most_recent) || listings[0];
  const rest = listings.filter(l => !l.is_most_recent && l !== mostRecent);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            CardLastSold <span className="text-primary">Pro</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Real Last Sold Price + Last Sold Date from eBay — every result includes a direct validation link.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='e.g. "2023 Topps Shohei Ohtani PSA 10"'
            className="flex-1 h-12 px-4 text-sm border-2 border-border rounded-xl bg-card focus:outline-none focus:border-primary transition-colors"
          />
          <Button type="submit" disabled={loading || !query.trim()} className="h-12 px-6 rounded-xl">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {!apifyToken && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>No Apify token set — results will use direct scraping (may be less reliable). <a href="/settings" className="font-bold underline">Add your token in Settings →</a></span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Searching eBay sold listings...</p>
            <p className="text-xs">This may take 15–30 seconds for live data</p>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {!loading && listings.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* Source + Validate link */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{listings.length} sold listings found{source === 'apify' ? ' via Apify' : ' via direct scrape'}</span>
                {searchUrl && (
                  <a href={searchUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" />
                    Verify all on eBay
                  </a>
                )}
              </div>

              {/* MOST RECENT SALE — Hero Card */}
              {mostRecent && (
                <div className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-bold uppercase tracking-wide opacity-90">Most Recent Sale</span>
                  </div>
                  <p className="text-sm opacity-80 leading-snug mb-4 line-clamp-2">{mostRecent.title}</p>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div>
                      <p className="text-xs opacity-70 mb-1 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Last Sold Price
                      </p>
                      <p className="text-4xl font-black font-mono">
                        ${mostRecent.last_sold_price?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Last Sold Date
                      </p>
                      <p className="text-2xl font-bold">
                        {mostRecent.last_sold_date
                          ? new Date(mostRecent.last_sold_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Date unknown'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={mostRecent.validation_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-white text-primary font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Validate on eBay
                  </a>
                </div>
              )}

              {/* Remaining Sales Table */}
              {rest.length > 0 && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-secondary/30">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">All Sold Listings</p>
                  </div>
                  <div className="divide-y divide-border">
                    {rest.map((listing, i) => (
                      <motion.div
                        key={listing.validation_link || i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors"
                      >
                        {/* Date */}
                        <div className="w-24 shrink-0 text-center">
                          <p className="text-[10px] text-muted-foreground">Last Sold Date</p>
                          <p className="text-xs font-semibold text-foreground">
                            {listing.last_sold_date
                              ? new Date(listing.last_sold_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                              : '—'}
                          </p>
                        </div>
                        {/* Price */}
                        <div className="w-24 shrink-0 text-center">
                          <p className="text-[10px] text-muted-foreground">Last Sold Price</p>
                          <p className="text-sm font-bold font-mono text-foreground">
                            ${listing.last_sold_price?.toLocaleString()}
                          </p>
                        </div>
                        {/* Title */}
                        <p className="flex-1 text-xs text-muted-foreground line-clamp-2 min-w-0">
                          {listing.title}
                        </p>
                        {/* Validate */}
                        <a
                          href={listing.validation_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 text-primary font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Validate on eBay
                        </a>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}