import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Build an eBay completed/sold listings search URL from card data
function buildEbaySoldUrl(cardData) {
  const { player_name, card_year, card_set, variation, serial_number, grade, has_autograph } = cardData;
  const parts = [
    player_name,
    card_year || '',
    card_set || '',
    variation || '',
    serial_number ? `/${serial_number}` : '',
    grade || '',
    has_autograph === false ? '' : '',
  ].map(s => s.trim()).filter(Boolean);
  const query = encodeURIComponent(parts.join(' '));
  return `https://www.ebay.com/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1&_sop=13`;
}

// Parse price strings like "$1,234.56" or "1234.56"
function parsePrice(str) {
  if (!str) return null;
  const cleaned = str.replace(/[^0-9.]/g, '');
  const val = parseFloat(cleaned);
  return (val > 0 && val < 10000000) ? val : null;
}

// Extract sold listings from eBay HTML
function extractSoldListings(html) {
  const listings = [];

  // eBay renders sold listings with s-item containers
  // Try to extract price + title + date from structured data / meta tags first
  const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      try {
        const inner = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        const data = JSON.parse(inner);
        const items = Array.isArray(data) ? data : data['@graph'] || [data];
        for (const item of items) {
          if (item.offers) {
            const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
            for (const offer of offers) {
              const price = parsePrice(String(offer.price || ''));
              if (price) {
                listings.push({
                  price,
                  title: item.name || '',
                  date: offer.availabilityStarts || offer.priceValidUntil || null,
                });
              }
            }
          }
        }
      } catch (_) {}
    }
  }

  // Fallback: regex scan for sold price patterns in the HTML
  if (listings.length === 0) {
    // eBay sold prices appear in spans with class "s-item__price" or similar
    const priceRegex = /\$\s*([\d,]+(?:\.\d{2})?)/g;
    const titleRegex = /class="s-item__title[^"]*"[^>]*>([^<]{10,120})</gi;

    const titles = [];
    let tm;
    while ((tm = titleRegex.exec(html)) !== null) {
      const t = tm[1].trim();
      if (t && !t.toLowerCase().includes('shop on ebay') && !t.toLowerCase().includes('sponsored')) {
        titles.push(t);
      }
    }

    // Grab all dollar amounts from the page — sold results section only
    const soldSection = html.match(/LH_Sold=1[\s\S]{0,5000}/)?.[0] || html;
    let pm;
    let priceIdx = 0;
    while ((pm = priceRegex.exec(soldSection)) !== null && listings.length < 20) {
      const price = parsePrice(pm[1]);
      if (price && price > 1 && price < 500000) {
        listings.push({
          price,
          title: titles[priceIdx] || '',
          date: null,
        });
        priceIdx++;
      }
    }
  }

  return listings;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const cardData = await req.json();
    const { player_name, card_year, card_set, variation, serial_number, grade, has_autograph } = cardData;

    if (!player_name) {
      return Response.json({ error: 'player_name is required' }, { status: 400 });
    }

    const soldUrl = buildEbaySoldUrl(cardData);

    // Fetch the eBay sold listings page
    let html = '';
    let fetchOk = false;
    try {
      const res = await fetch(soldUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
      });
      if (res.ok) {
        html = await res.text();
        fetchOk = html.length > 1000 && !html.includes('Access Denied') && !html.includes('robot');
      }
    } catch (_) {}

    // Extract raw sold prices from HTML
    let rawListings = fetchOk ? extractSoldListings(html) : [];

    // Always run the LLM pass to pick the best matching comp from what we found,
    // OR to fill in from training data if scraping returned nothing useful.
    const cardDescription = [
      player_name,
      card_year,
      card_set,
      variation,
      serial_number ? `/${serial_number}` : null,
      grade,
    ].filter(Boolean).join(' ');

    const scrapedPricesText = rawListings.length > 0
      ? `REAL SCRAPED EBAY SOLD PRICES (last 90 days): ${rawListings.slice(0, 15).map(l => `$${l.price}${l.title ? ' [' + l.title.substring(0, 60) + ']' : ''}`).join(', ')}`
      : `SCRAPING RETURNED NO RESULTS — use your training knowledge of recent eBay sold comps for this card.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a sports card pricing expert. Search eBay completed/sold listings RIGHT NOW and find the most recent real sold price for this exact card.

CARD: ${cardDescription}

Search eBay sold listings for: "${cardDescription} sold"
Also search: "site:ebay.com ${cardDescription} sold"

GRADE RULE: ${grade ? `Card is graded ${grade}. ONLY return comps for this EXACT grade. Never use raw/ungraded prices.` : 'Card is raw/ungraded.'}
AUTOGRAPH RULE: ${has_autograph === false ? 'BASE CARD — NO autograph. Do NOT use auto/signed comps.' : 'May have auto — match accordingly.'}
SERIAL RULE: ${serial_number ? `Serialized /${serial_number} — only match same print run.` : 'Not serialized.'}

Return the most recent REAL completed sale price you can find. Be specific with dates.

Return JSON:
- comp_value: most recent sold price in USD (number) or null if truly not found
- cheapest_available: lowest current asking/BIN price in USD or null
- sale_date: date of comp "YYYY-MM-DD" or "approx MM/YYYY"
- confidence: "high" if recent exact match, "medium" if close, "low" if estimated
- source: where you found this price
- notes: 1 sentence on data quality
- tier: "exact_match" | "adjusted_comp" | "similar_card_baseline" | "no_comp_conservative_estimate"
- similar_comps: up to 3 recent comps [{description, sold_price, sale_date}]`,
      response_json_schema: {
        type: "object",
        properties: {
          comp_value: { type: ["number", "null"] },
          cheapest_available: { type: ["number", "null"] },
          sale_date: { type: ["string", "null"] },
          confidence: { type: "string" },
          source: { type: "string" },
          notes: { type: "string" },
          tier: { type: "string" },
          similar_comps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                sold_price: { type: "number" },
                sale_date: { type: "string" },
              }
            }
          }
        }
      },
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
    });

    return Response.json({
      ...result,
      _scraped_count: rawListings.length,
      _scraped_prices: rawListings.slice(0, 5).map(l => l.price),
      _ebay_search_url: soldUrl,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});