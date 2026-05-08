import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query, apify_token } = await req.json();
    if (!query) return Response.json({ error: 'query is required' }, { status: 400 });

    const ebaySearchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1&_sop=13&_ipg=60`;

    let rawListings = [];
    let source = 'direct_scrape';

    // --- APIFY PATH ---
    if (apify_token) {
      try {
        const actorId = 'dtrungtin~ebay-items-scraper';
        const startRes = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${apify_token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startUrls: [{ url: ebaySearchUrl }],
            maxItems: 50,
            proxyConfiguration: { useApifyProxy: true },
          }),
        });

        if (startRes.ok) {
          const startData = await startRes.json();
          const runId = startData?.data?.id;
          const datasetId = startData?.data?.defaultDatasetId;

          if (runId) {
            let attempts = 0;
            let finished = false;
            while (attempts < 14 && !finished) {
              await new Promise(r => setTimeout(r, 5000));
              const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apify_token}`);
              const statusData = await statusRes.json();
              const status = statusData?.data?.status;
              if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED') {
                finished = true;
                if (status === 'SUCCEEDED' && datasetId) {
                  const dataRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apify_token}&format=json`);
                  const items = await dataRes.json();
                  rawListings = parseApifyItems(items, query);
                  if (rawListings.length > 0) source = 'apify';
                }
              }
              attempts++;
            }
          }
        }
      } catch (_) {}
    }

    // --- FALLBACK: direct HTML scrape ---
    if (rawListings.length === 0) {
      rawListings = await directScrape(ebaySearchUrl, query, base44);
    }

    if (rawListings.length === 0) {
      return Response.json({ listings: [], source, search_url: ebaySearchUrl, filtered_count: 0 });
    }

    // --- STRICT MATCH VALIDATION via LLM ---
    const validated = await strictMatchValidation(rawListings, query, base44);

    // Sort by date descending
    validated.sort((a, b) => {
      if (!a.last_sold_date) return 1;
      if (!b.last_sold_date) return -1;
      return new Date(b.last_sold_date) - new Date(a.last_sold_date);
    });

    if (validated.length > 0) validated[0].is_most_recent = true;

    return Response.json({
      listings: validated,
      source,
      search_url: ebaySearchUrl,
      raw_count: rawListings.length,
      filtered_count: rawListings.length - validated.length,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Parse Apify actor output ──────────────────────────────────────────────────
function parseApifyItems(items, query) {
  const results = [];
  for (const item of (items || [])) {
    const price = parsePrice(item.price || item.sellingStatus?.currentPrice?.value || item.soldPrice || '');
    const title = (item.title || item.name || '').trim();
    const date = item.soldDate || item.endTime || item.lastSoldDate || item.listingDate || null;
    const url = item.url || item.itemUrl || item.link || (item.itemId ? `https://www.ebay.com/itm/${item.itemId}` : null);
    const itemId = item.itemId ? String(item.itemId) : extractItemId(url);

    if (!price || !title || !url) continue;
    results.push({ title, last_sold_price: price, last_sold_date: formatDate(date), validation_link: url, item_id: itemId || '', search_query: query });
  }
  return results;
}

// ── Direct HTML scrape + LLM extraction ──────────────────────────────────────
async function directScrape(ebayUrl, query, base44) {
  let html = '';
  try {
    const res = await fetch(ebayUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (res.ok) html = await res.text();
  } catch (_) {}

  if (!html || html.length < 1000) return [];

  const extraction = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are an eBay data extractor. Extract ALL sold/completed listings from the HTML below.

For each listing extract EXACTLY:
- title: full listing title
- sold_price: number in USD (the final sold price only, not shipping)
- sold_date: date sold as YYYY-MM-DD (or null if not found)
- item_url: full eBay URL like https://www.ebay.com/itm/ITEMID
- item_id: the numeric eBay item ID from the URL

RULES:
- Only include listings with a real sold price > 0
- item_url MUST be a direct eBay item link (not a search link)
- Extract up to 50 listings
- The search was for: "${query}"

HTML:
${html.substring(0, 50000)}`,
    response_json_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              sold_price: { type: 'number' },
              sold_date: { type: ['string', 'null'] },
              item_url: { type: 'string' },
              item_id: { type: ['string', 'null'] },
            }
          }
        }
      }
    },
    model: 'gemini_3_flash',
  });

  return (extraction?.items || [])
    .filter(i => i.sold_price > 0 && i.item_url && i.item_url.includes('ebay.com'))
    .map(i => ({
      title: i.title || '',
      last_sold_price: i.sold_price,
      last_sold_date: i.sold_date || null,
      validation_link: i.item_url,
      item_id: i.item_id || extractItemId(i.item_url) || '',
      search_query: query,
    }));
}

// ── STRICT MATCH VALIDATION ───────────────────────────────────────────────────
// Uses LLM to judge each listing against the search query with strict rules.
async function strictMatchValidation(listings, query, base44) {
  if (listings.length === 0) return [];

  const titlesJson = listings.map((l, i) => ({ index: i, title: l.title }));

  const validation = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are an expert sports card listing validator. Your job is STRICT MATCH VALIDATION.

USER SEARCHED FOR: "${query}"

For each listing title below, determine if it is an EXACT MATCH for the searched card.

STRICT DISQUALIFICATION RULES — disqualify if ANY of these are true:
1. Different player name
2. Different year (e.g. 2022 vs 2023)
3. Different card set (e.g. Topps vs Bowman, Chrome vs Base, Prizm vs Select)
4. Different grade (e.g. PSA 9 vs PSA 10, BGS vs PSA)
5. Different grading company
6. Different parallel/color/refractor variation (e.g. Blue vs Gold, Refractor when base was searched)
7. Different card number or subset
8. Different auto status (auto when base was searched, or vice versa)
9. Different patch/relic status
10. Different rookie status
11. Multi-card lot or bundle
12. Reprint, custom, or replica card
13. Any ambiguity about whether it matches — if unsure, DISQUALIFY

IMPORTANT: Accuracy over quantity. When in doubt, EXCLUDE.

LISTINGS TO VALIDATE:
${JSON.stringify(titlesJson, null, 2)}

Return a JSON array where each item has:
- index: the listing index number
- is_match: true ONLY if this is definitely an exact match, false otherwise
- reason: one short sentence explaining why matched or disqualified`,
    response_json_schema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              index: { type: 'number' },
              is_match: { type: 'boolean' },
              reason: { type: 'string' },
            }
          }
        }
      }
    },
    model: 'gemini_3_flash',
  });

  const validationResults = validation?.results || [];
  const matchedIndices = new Set(
    validationResults.filter(r => r.is_match === true).map(r => r.index)
  );

  return listings
    .map((listing, i) => ({
      ...listing,
      is_exact_match: matchedIndices.has(i),
      validation_status: matchedIndices.has(i) ? 'exact_match_verified' : 'excluded',
      match_reason: validationResults.find(r => r.index === i)?.reason || '',
    }))
    .filter(l => l.is_exact_match);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parsePrice(val) {
  if (!val) return null;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return n > 0 && n < 10000000 ? n : null;
}

function extractItemId(url) {
  if (!url) return null;
  const m = url.match(/\/itm\/(\d+)/);
  return m ? m[1] : null;
}

function formatDate(raw) {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toISOString().split('T')[0];
  } catch (_) { return raw; }
}