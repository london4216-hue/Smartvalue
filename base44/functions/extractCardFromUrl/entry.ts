import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function parseUrlHints(url) {
  try {
    const u = new URL(url);
    let skw = (u.searchParams.get('_skw') || u.searchParams.get('_nkw') || '').trim();
    skw = skw.replace(/\+/g, ' ').replace(/%20/g, ' ');
    
    const imgHashMatch = url.match(/hash=item[^:]+:g:([A-Za-z0-9~_-]+)/);
    const imgHash = imgHashMatch ? imgHashMatch[1] : null;
    
    let itemId = null;
    const itmPathMatch = u.pathname.match(/\/itm\/([^?#]+)/i);
    if (itmPathMatch) {
      const segment = itmPathMatch[1];
      if (/^\d{8,13}$/.test(segment)) {
        itemId = segment;
      } else {
        const parts = segment.split('-');
        for (let i = parts.length - 1; i >= 0; i--) {
          if (/^\d{8,13}$/.test(parts[i])) {
            itemId = parts[i];
            break;
          }
        }
      }
    }

    const imageFromHash = imgHash ? `https://i.ebayimg.com/images/g/${imgHash}/s-l1600.jpg` : null;
    
    return { itemId, skw, imgHash, imageFromHash };
  } catch (_) {
    return { itemId: null, skw: '', imgHash: null, imageFromHash: null };
  }
}

// Manual parse from keywords string
function parseCardFromKeywords(keywordStr) {
  if (!keywordStr || keywordStr.length < 3) return null;
  
  const str = keywordStr.replace(/\+/g, ' ').replace(/%20/g, ' ').toLowerCase().trim();
  const words = str.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return null;
  
  // Find player name (first 1-2 words that aren't common card terms)
  const cardTerms = ['prizm', 'optic', 'select', 'mosaic', 'donruss', 'topps', 'hoops', 'psa', 'bgspsa', 'graded', 'raw', 'rookie', 'rc', 'auto', 'patch'];
  const playerWords = words.filter(w => !cardTerms.some(ct => w.includes(ct)) && !/^\d+$/.test(w));
  let playerName = playerWords.slice(0, 2).join(' ').trim();
  if (!playerName) playerName = words[0]; // fallback to first word
  
  // Find year
  const yearMatch = str.match(/\b(19|20)\d{2}\b/);
  const cardYear = yearMatch ? yearMatch[0] : null;
  
  // Find set
  const sets = ['prizm', 'optic', 'select', 'mosaic', 'donruss', 'topps', 'hoops', 'fleer', 'crown royale', 'national treasures'];
  const cardSet = sets.find(s => str.includes(s)) ? sets.find(s => str.includes(s)).split(' ')[0] : null;
  
  // Find variation
  const variations = ['silver', 'gold', 'purple', 'blue', 'red', 'pink', 'orange', 'green', 'white', 'black', 'hyper', 'base'];
  const variation = variations.find(v => str.includes(v)) || null;
  
  // Find grade
  const gradeMatch = str.match(/psa\s*(\d+(?:\.\d)?)|bgspsa\s*(\d+(?:\.\d)?)|raw|graded/i);
  let grade = null;
  if (gradeMatch) {
    if (gradeMatch[0].toLowerCase().includes('psa')) grade = 'PSA ' + (gradeMatch[1] || gradeMatch[2] || '');
    else if (gradeMatch[0].toLowerCase() === 'raw') grade = 'Raw';
  }
  
  return {
    player_name: playerName.charAt(0).toUpperCase() + playerName.slice(1),
    card_year: cardYear,
    card_set: cardSet ? cardSet.charAt(0).toUpperCase() + cardSet.slice(1) : null,
    card_number: null,
    variation: variation ? variation.charAt(0).toUpperCase() + variation.slice(1) : null,
    serial_number: null,
    grade: grade,
    is_rookie_year: str.includes('rookie') || str.includes('rc'),
    color_matches_team: variation ? true : false,
    has_autograph: str.includes('auto'),
    has_patch: str.includes('patch') || str.includes('rpa'),
    player_popularity: null,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let { url } = await req.json();
    if (!url) return Response.json({ error: 'URL is required' }, { status: 400 });

    url = url.trim();

    // Follow short links
    if (url.includes('ebay.us/')) {
      try {
        const redirectRes = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' }
        });
        if (redirectRes.url) url = redirectRes.url;
      } catch (_) {}
    }

    const { itemId, skw, imageFromHash } = parseUrlHints(url);

    // Try to fetch listing page
    let scrapedTitle = '';
    let scrapedPrice = 0;
    let scrapedImage = '';

    if (itemId) {
      try {
        const res = await fetch(`https://www.ebay.com/itm/${itemId}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0' }
        });
        if (res.ok) {
          const html = await res.text();
          if (!html.includes('Access Denied') && html.length > 500) {
            const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"'<]+)["']/i)
              || html.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch) scrapedTitle = titleMatch[1].replace(/ \| eBay.*$/i, '').trim();

            const priceMatch = html.match(/"convertedCurrentPrice"\s*:\s*\{"value":"([0-9,.]+)"/)
              || html.match(/itemprop="price"[^>]+content="([0-9,.]+)"/i)
              || html.match(/"price"\s*:\s*"([0-9,.]+)"/i)
              || html.match(/\$([0-9,.]+)\s*<span[^>]*>(Buy It Now|Bid)/i);
            if (priceMatch) scrapedPrice = parseFloat(priceMatch[1].replace(/,/g, ''));

            const imgMatch = html.match(/https:\/\/i\.ebayimg\.com\/images\/g\/[^"'\s\\]+\/s-l[0-9]+\.(jpg|webp)/i);
            if (imgMatch) scrapedImage = imgMatch[0];
          }
        }
      } catch (_) {}
    }

    // Use scraped title or keywords
    let dataToAnalyze = scrapedTitle || skw || '';
    
    // Parse manually
    let result = parseCardFromKeywords(dataToAnalyze);
    
    // If no success and we have an item ID, try web search as fallback
    if ((!result || !result.player_name) && itemId) {
      try {
        const searchResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Search eBay for item ${itemId}. Extract: player name, card year, card set, grade, and the current Buy It Now asking price in dollars.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              player_name: { type: "string" },
              card_year: { type: "string" },
              card_set: { type: "string" },
              grade: { type: "string" },
              asking_price: { type: "number" }
            }
          }
        });
        if (searchResult?.player_name) {
          dataToAnalyze = `${searchResult.player_name} ${searchResult.card_year || ''} ${searchResult.card_set || ''} ${searchResult.grade || ''}`;
          result = parseCardFromKeywords(dataToAnalyze);
          if (searchResult?.asking_price && searchResult.asking_price > 0) {
            scrapedPrice = searchResult.asking_price;
          }
        }
      } catch (_) {}
    }
    
    if (!result || !result.player_name) {
      return Response.json({
        error: 'Could not identify the card from this URL. Try a URL with card keywords or enter details manually.'
      }, { status: 422 });
    }

    // Add pricing & image
    result.comp_value = null;
    result.cheapest_available = scrapedPrice || null;
    result.image_url = scrapedImage || imageFromHash || null;

    // AI Grade Assessment from image
    let aiGradeAssessment = null;
    if (result.image_url) {
      try {
        const gradeResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Grade this sports card image using PSA/BGS/SGC standards.

Card: ${result.player_name} ${result.card_year} ${result.card_set}

Return:
- estimated_grade (e.g. "9" or "8.5")
- confidence ("high", "medium", or "low")
- key_observations (array of 2-3 observations)
- grade_range (e.g. "8-9")`,
          response_json_schema: {
            type: "object",
            properties: {
              estimated_grade: { type: "string" },
              confidence: { type: "string" },
              key_observations: { type: "array", items: { type: "string" } },
              grade_range: { type: "string" },
            }
          },
          file_urls: [result.image_url],
          model: 'gemini_3_1_pro',
        });
        aiGradeAssessment = gradeResult;
      } catch (_) {}
    }

    if (aiGradeAssessment) {
      result.ai_grade_assessment = aiGradeAssessment;
      result.ai_grade_disclosure = 'Our AI analyzes card images using PSA, BGS, and SGC grading standards. This is an estimated projection, not a guarantee. Actual graded results may differ based on professional examination and proprietary grader standards.';
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});