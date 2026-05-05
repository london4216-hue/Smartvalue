import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function tryFetchPage(url) {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  ];
  for (const ua of agents) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });
      const html = await res.text();
      // Must have real content and no bot/login walls
      if (
        html.length > 5000 &&
        !html.includes('verify you\'re not a robot') &&
        !html.includes('robot or not') &&
        !html.includes('Sign in to continue') &&
        !html.includes('g-recaptcha') &&
        !html.includes('Yolo Login') &&
        (html.includes('<h1') || html.includes('og:title'))
      ) {
        return html;
      }
    } catch (_) {}
  }
  return null;
}

function parseHtml(html) {
  const get = (re) => (html.match(re) || [])[1] || '';
  const ogTitle  = get(/property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const ogDesc   = get(/property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const ogImage  = get(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const twImage  = get(/name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  const htmlTitle = get(/<title[^>]*>([^<]+)<\/title>/i).replace(/\s*[|\-–].+/, '').trim();
  const h1 = get(/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, '').trim();

  // Best eBay image URL
  const ebayImgM = html.match(/https:\/\/i\.ebayimg\.com\/images\/g\/[A-Za-z0-9~_-]+\/s-l[0-9]+\.[a-z]+/);
  const ebayImg  = ebayImgM ? ebayImgM[0].replace(/s-l\d+\./, 's-l1600.') : '';

  const jsonLdRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const jBlocks = [];
  let m;
  while ((m = jsonLdRe.exec(html)) !== null) jBlocks.push(m[1].substring(0, 2000));

  const prices = [...new Set((html.match(/\$[\d,]+\.?\d{0,2}/g) || []))].slice(0, 20).join(', ');
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .substring(0, 5000);

  const title = ogTitle || htmlTitle || h1 || '';
  const image = ebayImg || ogImage || twImage || '';
  // Only "useful" if we got real listing data (not a redirect/login page)
  const useful = title.length > 15 &&
    !title.toLowerCase().includes('sign in') &&
    !title.toLowerCase().includes('ebay yolo') &&
    !title.toLowerCase().includes('welcome to ebay');

  return { useful, title, ogDesc, image, prices, jsonLd: jBlocks.join('\n'), stripped };
}

function cleanResult(result) {
  // Clean "null", "unknown", "undefined" strings that LLMs sometimes emit
  const BAD = new Set(['null', 'unknown', 'undefined', 'n/a', 'none', '', '0']);
  for (const key of ['player_name', 'card_year', 'card_set', 'card_number', 'variation', 'serial_number', 'grade', 'image_url']) {
    if (!result[key] || BAD.has(String(result[key]).toLowerCase().trim())) {
      result[key] = null;
    }
  }
  for (const key of ['comp_value', 'cheapest_available']) {
    const v = parseFloat(result[key]);
    result[key] = (!v || isNaN(v) || v <= 0) ? null : v;
  }
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await req.json();
    if (!url) return Response.json({ error: 'URL is required' }, { status: 400 });

    const ebayItemMatch = url.match(/(?:\/itm\/|itemId=|item=)(\d{10,13})/i);
    const ebayItemId = ebayItemMatch ? ebayItemMatch[1] : null;

    // Try scraping first
    const html = await tryFetchPage(url);
    const s = html ? parseHtml(html) : { useful: false, title: '', ogDesc: '', image: '', prices: '', jsonLd: '', stripped: '' };

    const scrapedBlock = s.useful
      ? `=== SCRAPED PAGE DATA (USE AS PRIMARY SOURCE) ===
TITLE: ${s.title}
DESCRIPTION: ${s.ogDesc}
PRICES ON PAGE: ${s.prices}
IMAGE URL: ${s.image}
JSON-LD:
${s.jsonLd}
PAGE TEXT:
${s.stripped}
===================================================`
      : `NOTE: The eBay page could not be scraped (login wall or bot block). This is common for ended/expired listings.
You MUST use web search to find the card details.`;

    const prompt = `You are a sports card identification engine. Your ONLY job is to identify a specific card from an eBay listing and return its data as JSON.

URL: ${url}
${ebayItemId ? `EBAY ITEM ID: ${ebayItemId}` : ''}

${scrapedBlock}

${!s.useful ? `IMPORTANT: Since the page is blocked, use web search NOW:
1. Search Google for: "ebay.com/itm/${ebayItemId}" to find cached versions or references
2. Search: "eBay ${ebayItemId} card" 
3. Search: "ebay item number ${ebayItemId} sports card"
4. Try: site:130point.com OR site:cardladder.com for any reference to this item
5. If it appears to be an ended listing, search for the same card type and estimate price from recent comps` : ''}

EXTRACTION RULES:
- player_name: Full player name from title (First Last). If not found, return null.
- card_year: 4-digit year from title (e.g. 2023). null if not found.
- card_set: Brand/product name (Prizm, National Treasures, Topps Chrome, etc.). null if not found.
- card_number: The card's number in the set (e.g. from "#136" return "136"). null if absent.
- variation: Parallel/color (Silver, Gold, Purple, Hyper, etc.). NOT the grade. null if base/none.
- serial_number: From "/10", "/25", "/99" patterns → return just the number (e.g. "25"). null if not serialized.
- grade: Exact grading info (PSA 10, BGS 9.5, SGC 10, Raw, Ungraded). null if not stated.
- cheapest_available: Current asking price (BIN price) for this listing. null if not found.
- comp_value: Last SOLD price from a completed transaction (eBay completed, 130point, cardladder). DIFFERENT from asking price. null if not found.
- image_url: ${s.image ? `Use this exact scraped URL: "${s.image}"` : 'The card image URL from the listing (i.ebayimg.com/...). null if not found.'}
- is_rookie_year: true only if this is the player's official NBA/NFL/MLB rookie year card.
- has_autograph: true if "Auto" or "Autograph" appears in the title.
- has_patch: true if "Patch", "RPA", "Mem", or memorabilia is mentioned.
- color_matches_team: true if the parallel color matches the player's team colors.
- player_popularity: Current market status — "rising" | "peak" | "legend" | "declining".

CRITICAL RULES:
- If the card CANNOT be identified at all (listing deleted, no data found anywhere), return player_name as null.
- NEVER invent or hallucinate a player name. Only use what you actually find.
- comp_value and cheapest_available must be DIFFERENT numbers (one is a past sale, one is a current ask).

Return ONLY valid JSON, no markdown, no explanation:
{
  "player_name": "First Last",
  "card_year": "2023",
  "card_set": "Prizm",
  "card_number": "136",
  "variation": "Silver",
  "serial_number": null,
  "grade": "PSA 10",
  "comp_value": 250,
  "cheapest_available": 299,
  "image_url": "https://i.ebayimg.com/...",
  "is_rookie_year": false,
  "color_matches_team": false,
  "has_autograph": false,
  "has_patch": false,
  "player_popularity": "peak"
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          player_name:        { type: "string" },
          card_year:          { type: "string" },
          card_set:           { type: "string" },
          card_number:        { type: "string" },
          variation:          { type: "string" },
          serial_number:      { type: "string" },
          grade:              { type: "string" },
          comp_value:         { type: "number" },
          cheapest_available: { type: "number" },
          image_url:          { type: "string" },
          is_rookie_year:     { type: "boolean" },
          color_matches_team: { type: "boolean" },
          has_autograph:      { type: "boolean" },
          has_patch:          { type: "boolean" },
          player_popularity:  { type: "string" },
        }
      },
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
    });

    const cleaned = cleanResult(result);

    if (!cleaned.player_name) {
      return Response.json({
        error: 'This eBay listing could not be found — it may have ended or been removed. Please enter the card details manually.'
      }, { status: 422 });
    }

    // Always prefer real scraped image
    if (s.image && !cleaned.image_url) cleaned.image_url = s.image;

    return Response.json(cleaned);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});