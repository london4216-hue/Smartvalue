import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function fetchPage(url) {
  const strategies = [
    {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    },
    {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    {
      'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Accept': 'text/html',
    },
  ];

  for (const headers of strategies) {
    try {
      const res = await fetch(url, { headers, redirect: 'follow' });
      const html = await res.text();
      if (html.length > 3000 &&
          !html.includes('verify you\'re not a robot') &&
          !html.includes('robot or not') &&
          !html.includes('Sign in to continue')) {
        return html;
      }
    } catch (_) { /* try next */ }
  }
  return null;
}

function extractFromHtml(html) {
  const ogTitle   = (html.match(/property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || [])[1] || '';
  const ogDesc    = (html.match(/property=["']og:description["'][^>]+content=["']([^"']+)["']/i) || [])[1] || '';
  const ogImage   = (html.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || [])[1] || '';
  const twImage   = (html.match(/name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) || [])[1] || '';
  const ebayImgM  = html.match(/https:\/\/i\.ebayimg\.com\/images\/g\/[^"' ]+/);
  const ebayImg   = ebayImgM ? ebayImgM[0] : '';

  const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title  = titleM ? titleM[1].trim() : '';
  const h1M    = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1     = h1M ? h1M[1].replace(/<[^>]+>/g, '').trim() : '';

  const jsonLdRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const jsonLdBlocks = [];
  let m;
  while ((m = jsonLdRe.exec(html)) !== null) {
    jsonLdBlocks.push(m[1].substring(0, 1500));
  }

  const priceMatches = html.match(/\$[\d,]+\.?\d{0,2}/g) || [];
  const prices = [...new Set(priceMatches)].slice(0, 20).join(', ');

  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .substring(0, 5000);

  const image_url = ebayImg || ogImage || twImage || '';
  const scraped_title = ogTitle || title || h1 || '';
  const useful = scraped_title.length > 10 || ogDesc.length > 10;

  return { useful, image_url, scraped_title, ogDesc, prices, jsonLd: jsonLdBlocks.join('\n'), stripped };
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

    const html = await fetchPage(url);
    const s = html ? extractFromHtml(html) : { useful: false, image_url: '', scraped_title: '', ogDesc: '', prices: '', jsonLd: '', stripped: '' };

    const prompt = s.useful ? `SYSTEM INSTRUCTION — FOLLOW EXACTLY. OUTPUT JSON ONLY. NO MARKDOWN. NO COMMENTARY.
NEVER ask the user to confirm the card. NEVER guess. NEVER substitute a different card.
ALWAYS use the scraped data below as the SINGLE source of truth.

SOURCE URL: ${url}
${ebayItemId ? `EBAY ITEM ID: ${ebayItemId}` : ''}

=== SCRAPED DATA (SINGLE SOURCE OF TRUTH) ===
SCRAPED_TITLE: ${s.scraped_title}
SCRAPED_OG_DESC: ${s.ogDesc}
SCRAPED_PRICES_ON_PAGE: ${s.prices}
SCRAPED_IMAGE_URL: ${s.image_url}
SCRAPED_JSON_LD:
${s.jsonLd}
SCRAPED_PAGE_TEXT:
${s.stripped}
=============================================

CARD IDENTIFICATION RULES — READ EVERY WORD OF SCRAPED_TITLE:
1. player_name: The FULL player name from the title. First proper noun(s). NEVER invent or substitute.
2. card_year: 4-digit year (e.g. 2021, 2023). Extract from title only.
3. card_set: Brand/set name (Prizm, National Treasures, Optic, Select, Mosaic, Topps Chrome, etc.).
4. card_number: Card # in set (e.g. "#136" → "136"). null if absent.
5. variation: Parallel/color name only (Silver, Gold, Purple Wave, Hyper, etc.). NOT the grade.
6. serial_number: Pattern like "/25", "/10", "/99" → return just the NUMBER (e.g. "25"). null if none.
7. grade: Grading info exactly as written (PSA 10, BGS 9.5, SGC 10, Raw, Ungraded, etc.). null if none.
8. cheapest_available: The ASKING PRICE from SCRAPED_PRICES_ON_PAGE for this listing (what seller wants now).
9. image_url: Use SCRAPED_IMAGE_URL exactly: "${s.image_url}"

PRICE RULES:
- cheapest_available = the price the seller is asking RIGHT NOW on this listing (from SCRAPED_PRICES_ON_PAGE).
- comp_value = what a BUYER ACTUALLY PAID in a COMPLETED/SOLD transaction. Search eBay completed listings, 130point.com, cardladder.com for the EXACT card (same player, set, variation, serial, grade).
- comp_value and cheapest_available are ALWAYS DIFFERENT numbers. comp_value is a past sale. cheapest_available is a current ask.
- If no real sold comp found, set comp_value to null. DO NOT use the asking price as comp_value.

Search the web now for sold comps:
- "eBay completed ${s.scraped_title} sold"
- 130point.com: ${s.scraped_title}
- cardladder.com: ${s.scraped_title}
${ebayItemId ? `- eBay item ${ebayItemId} completed` : ''}`

    : `SYSTEM INSTRUCTION — FOLLOW EXACTLY. OUTPUT JSON ONLY. NO MARKDOWN. NO COMMENTARY.
NEVER guess. NEVER substitute a different card. NEVER invent a player name.
The page could not be scraped. Use ONLY web search to identify this card from its URL.

SOURCE URL: ${url}
${ebayItemId ? `EBAY ITEM ID: ${ebayItemId}

STEP 1: Search the web for eBay item number ${ebayItemId} to get the EXACT listing title.
STEP 2: From the title extract: player name, year, set, parallel/variation, serial number (/XX), grade.
STEP 3: Search eBay completed listings + 130point.com + cardladder.com for the last SOLD price of this exact card.
STEP 4: cheapest_available = current asking price on this listing. comp_value = last real hammer price paid.` : `
STEP 1: Search for or visit: ${url}
STEP 2: Extract all card details from the listing title only.
STEP 3: Find sold comps on eBay completed, 130point.com, cardladder.com.`}

RULES:
- NEVER invent a player name — only use what you find in the listing title.
- comp_value = real hammer price from a COMPLETED sale (different from asking price).
- cheapest_available = current asking price on the active listing.
- If the card cannot be identified, return player_name as null.`;

    const jsonSchema = `

Return ONLY this JSON object — no markdown, no commentary:
{
  "player_name": "First Last" or null,
  "card_year": "YYYY" or null,
  "card_set": "Set Name" or null,
  "card_number": "###" or null,
  "variation": "Parallel Name" or null,
  "serial_number": "##" or null,
  "grade": "PSA 10" or null,
  "comp_value": number or null,
  "cheapest_available": number or null,
  "image_url": "${s.image_url}",
  "is_rookie_year": true or false,
  "color_matches_team": true or false,
  "has_autograph": true or false,
  "has_patch": true or false,
  "player_popularity": "rising" or "peak" or "legend" or "declining"
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt + jsonSchema,
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

    if (!result.player_name || result.player_name === 'Unknown') {
      return Response.json({ error: 'Could not extract card details from this URL.' }, { status: 422 });
    }

    // Always prefer the real scraped image over anything the LLM returned
    if (s.image_url) result.image_url = s.image_url;

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});