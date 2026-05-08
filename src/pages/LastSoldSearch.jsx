import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Search, ExternalLink, Loader2, AlertCircle, CheckCircle2, Calendar, DollarSign, ShieldCheck, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

function formatDate(dateStr) {
  if (!dateStr) return 'Date unknown';
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (_) { return dateStr; }
}

function ExactMatchBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
      <ShieldCheck className="w-3 h-3" />
      EXACT MATCH VERIFIED
    </span>
  );
}

export default function LastSoldSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState([]);
  const [searchUrl, setSearchUrl] = useState('');
  const [source, setSource] = useState('');
  const [rawCount, setRawCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [error, setError] = useState('');
  const [apifyToken, setApifyToken] = useState('');
  const [lastQuery, setLastQuery] = useState('');

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
    setRawCount(0);
    setFilteredCount(0);
    setLastQuery(query.trim());

    try {
      const res = await base44.functions.invoke('searchSoldListings', {
        query: query.trim(),
        apify_token: apifyToken || null,
      });

      const data = res.data;
      if (data.error) { setError(data.error); return; }

      const validListings = data.listings || [];
      setListings(validListings);
      setSearchUrl(data.search_url || '');
      setSource(data.source || '');
      setRawCount(data.raw_count || 0);
      setFilteredCount(data.filtered_count || 0);

      // Save validated results to database
      if (validListings.length > 0) {
        const toSave = validListings.map(l => ({
          search_query: l.search_query || query.trim(),
          title: l.title,
          last_sold_price: l.last_sold_price,
          last_sold_date: l.last_sold_date || null,
          validation_link: l.validation_link,
          item_id: l.item_id || '',
          is_most_recent: l.is_most_recent || false,
        }));
        base44.entities.SoldListing.bulkCreate(toSave).catch(() => {});
      }

      if (!validListings.length) {
        setError(
          data.raw_count > 0
            ? `Found ${data.raw_count} listings on eBay but NONE passed strict match validation. Try a more specific search or check eBay directly.`
            : 'No sold listings found for this search. Try adjusting your search terms.'
        );
      }
    } catch (err) {
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const mostRecent = listings[0];
  const rest = listings.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="text-center space-y-1.5">
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            CardLastSold <span className="text-primary">Pro</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Accurate, verified Last Sold Price + Last Sold Date from eBay. Every result is strict-match validated and includes a direct link to the original listing.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='e.g. "2023 Topps Chrome Shohei Ohtani PSA 10"'
            className="flex-1 h-12 px-4 text-sm border-2 border-border rounded-xl bg-card focus:outline-none focus:border-primary transition-colors"
          />
          <Button type="submit" disabled={loading || !query.trim()} className="h-12 px-6 rounded-xl font-bold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {/* Apify warning */}
        {!apifyToken && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              No Apify token — using direct scraping (less reliable).{' '}
              <Link to="/settings" className="font-bold underline">Add your token in Settings →</Link>
            </span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>{error}</p>
              {searchUrl && (
                <a href={searchUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-primary underline text-xs">
                  <ExternalLink className="w-3 h-3" />
                  Check eBay directly
                </a>
              )}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-semibold">Fetching & validating sold listings...</p>
            <p className="text-xs text-center max-w-xs">
              Searching eBay, extracting results, then running strict match validation. This may take 20–40 seconds.
            </p>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {!loading && listings.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* Stats bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <strong className="text-foreground">{listings.length}</strong> exact matches for "{lastQuery}"
                  </span>
                  {filteredCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Filter className="w-3 h-3" />
                      {filteredCount} listings excluded (not exact match)
                    </span>
                  )}
                </div>
                {searchUrl && (
                  <a href={searchUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" />
                    View all on eBay
                  </a>
                )}
              </div>

              {/* ── MOST RECENT SALE — Hero ── */}
              {mostRecent && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-primary rounded-2xl p-6 shadow-xl text-primary-foreground"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-black uppercase tracking-widest opacity-90">Most Recent Sale</span>
                    </div>
                    <span className="inline-flex items-center gap-1 bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" />
                      EXACT MATCH VERIFIED
                    </span>
                  </div>

                  <p className="text-sm opacity-80 leading-snug mb-5 font-medium">{mostRecent.title}</p>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-xs opacity-60 mb-1 flex items-center gap-1 font-semibold uppercase tracking-wide">
                        <DollarSign className="w-3 h-3" />
                        Last Sold Price
                      </p>
                      <p className="text-5xl font-black font-mono leading-none">
                        ${mostRecent.last_sold_price?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs opacity-60 mb-1 flex items-center gap-1 font-semibold uppercase tracking-wide">
                        <Calendar className="w-3 h-3" />
                        Last Sold Date
                      </p>
                      <p className="text-2xl font-bold leading-tight">
                        {formatDate(mostRecent.last_sold_date)}
                      </p>
                    </div>
                  </div>

                  <a
                    href={mostRecent.validation_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-white text-primary font-black text-sm px-6 py-3 rounded-xl hover:bg-white/90 transition-colors shadow-md"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Validate on eBay →
                  </a>
                </motion.div>
              )}

              {/* ── All Other Validated Sales ── */}
              {rest.length > 0 && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-secondary/40 flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide">All Verified Sales</p>
                    <span className="text-xs text-muted-foreground">{rest.length} more results</span>
                  </div>
                  <div className="divide-y divide-border">
                    {rest.map((listing, i) => (
                      <motion.div
                        key={listing.validation_link || i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="px-4 py-3 hover:bg-secondary/20 transition-colors"
                      >
                        {/* Title + badge */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-xs font-medium text-foreground leading-snug flex-1">{listing.title}</p>
                          <ExactMatchBadge />
                        </div>
                        {/* Price / Date / Button row */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="shrink-0">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Last Sold Price</p>
                            <p className="text-base font-black font-mono text-foreground">
                              ${listing.last_sold_price?.toLocaleString()}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Last Sold Date</p>
                            <p className="text-sm font-semibold text-foreground">
                              {formatDate(listing.last_sold_date)}
                            </p>
                          </div>
                          <div className="ml-auto">
                            <a
                              href={listing.validation_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/40 text-primary font-bold text-xs px-4 py-2 rounded-lg hover:bg-primary hover:text-white transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Validate on eBay
                            </a>
                          </div>
                        </div>
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