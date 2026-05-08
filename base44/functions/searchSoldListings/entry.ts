import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query, apify_token } = await req.json();
    if (!query) return Response.json({ error: 'query is required' }, { status: 400 });
    if (!apify_token) return Response.json({ error: 'Apify API token is required. Please add it in Settings.' }, { status: 400 });

    // Build eBay sold listings search URL
    const ebaySearchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1&_sop=13&_ipg=60`;

    // Use Apify's eBay Scraper actor
    const actorId = 'dtrungtin~ebay-items-scraper';

    // Start the Apify actor run
    const startRes = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${apify_token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url: ebaySearchUrl }],
        maxItems: 30,
        proxyConfiguration: { useApifyProxy: true },
      }),
    });

    if (!startRes.ok) {
      const errText = await startRes.text();
      // Fallback to direct scrape if Apify actor fails
      return await fallbackDirectScrape(query, base44);
    }

    const startData = await startRes.json();
    const runId = startData?.data?.id;
    if (!runId) return await fallbackDirectScrape(query, base44);

    // Poll for completion (max 60s)
    let attempts = 0;
    let finished = false;
    while (attempts < 12 && !finished) {
      await new Promise(r => setTimeout(r, 5000));
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apify_token}`);
      const statusData = await statusRes.json();
      const status = statusData?.data?.status;
      if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED') {
        finished = true;
        if (status !== 'SUCCEEDED') return await fallbackDirectScrape(query, base44);
      }
      attempts++;
    }

    if (!finished) return await fallbackDirectScrape(query, base44);

    // Fetch dataset results
    const datasetId = startData?.data?.defaultDatasetId;
    const dataRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apify_token}&format=json`);
    const rawItems = await dataRes.json();

    const listings = parseApifyResults(rawItems, query);
    if (listings.length === 0) return await fallbackDirectScrape(query, base44);

    return Response.json({ listings, source: 'apify', search_url: ebaySearchUrl });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function parseApifyResults(items, query) {
  const results = [];
  for (const item of (items || [])) {
    const price = parsePrice(item.price || item.sellingStatus?.currentPrice?.value || item.soldPrice || '');
    const title = item.title || item.name || '';
    const date = item.soldDate || item.endTime || item.lastSoldDate || item.listingDate || null;
    const url = item.url || item.itemUrl || item.link || (item.itemId ? `https://www.ebay.com/itm/${item.itemId}` : null);
    const itemId = item.itemId || extractItemId(url);

    if (!price || !title || !url) continue;

    results.push({
      title,
      last_sold_price: price,
      last_sold_date: formatDate(date),
      validation_link: url,
      item_id: itemId || '',
      search_query: query,
    });
  }

  // Sort by date descending, most recent first
  results.sort((a, b) => {
    if (!a.last_sold_date) return 1;
    if (!b.last_sold_date) return -1;
    return new Date(b.last_sold_date) - new Date(a.last_sold_date);
  });

  if (results.length > 0) results[0].is_most_recent = true;
  return results;
}

async function fallbackDirectScrape(query, base44) {
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1&_sop=13&_ipg=60`;

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

  // Use LLM to extract structured data from HTML
  const listings = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Extract sold eBay listings from this HTML. Find all completed/sold items.
For each item extract: title, sold_price (number, USD), sold_date (YYYY-MM-DD), item_url (full https://www.ebay.com/itm/... URL), item_id.
Return ONLY items that have an actual sold price. Sort by most recent date first.
Max 25 items. Search was for: "${query}"

HTML (first 40000 chars):
${html.substring(0, 40000)}`,
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

  const items = listings?.items || [];
  const results = items
    .filter(i => i.sold_price > 0 && i.item_url)
    .map(i => ({
      title: i.title || '',
      last_sold_price: i.sold_price,
      last_sold_date: i.sold_date || null,
      validation_link: i.item_url,
      item_id: i.item_id || extractItemId(i.item_url),
      search_query: query,
      is_most_recent: false,
    }));

  if (results.length > 0) results[0].is_most_recent = true;
  return Response.json({ listings: results, source: 'direct_scrape', search_url: ebayUrl });
}

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
  } catch (_) {
    return raw;
  }
}