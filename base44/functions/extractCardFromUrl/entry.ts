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
  
  // Decode URL-encoded characters
  const str = decodeURIComponent(keywordStr)
    .replace(/\+/g, ' ')
    .replace(/%20/g, ' ')
    .toLowerCase()
    .trim();
  
  const words = str.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return null;
  
  // Find player name (first 1-2 words that aren't common card terms, brands, or years)
  const cardTerms = ['panini', 'prizm', 'optic', 'select', 'mosaic', 'donruss', 'topps', 'hoops', 'psa', 'bgspsa', 'graded', 'raw', 'rookie', 'rc', 'auto', 'patch', 'silver', 'gold', 'cracked', 'ice', 'sp', 'card', '#'];
  const playerWords = words.filter(w => 
    !cardTerms.includes(w) && 
    !/^\d+(-\d+)?$/.test(w) && // exclude years like "2023" or "2023-24"
    !/^\d+$/.test(w) && 
    w.length > 2
  );
  let playerName = playerWords.slice(0, 2).join(' ').trim();
  if (!playerName) playerName = words.find(w => !/(^\d+|^\d+-\d+$)/.test(w) && w.length > 2) || words[0]; // fallback
  
  // Find year (2023 or 2023-24 format)
  const yearMatch = str.match(/\b(19|20)\d{2}(?:-\d{2})?\b/);
  const cardYear = yearMatch ? yearMatch[0] : null;
  
  // Find set
  const sets = ['prizm', 'optic', 'select', 'mosaic', 'donruss', 'topps', 'hoops', 'fleer', 'crown royale', 'national treasures'];
  const cardSet = sets.find(s => str.includes(s)) ? sets.find(s => str.includes(s)).split(' ')[0] : null;
  
  // Find variation — include "cracked ice" as a variation
  const variations = ['silver', 'gold', 'purple', 'blue', 'red', 'pink', 'orange', 'green', 'white', 'black', 'hyper', 'base', 'cracked ice'];
  let variation = null;
  for (const v of variations) {
    if (str.includes(v)) {
      variation = v;
      break;
    }
  }
  
  // Find grade
  const gradeMatch = str.match(/psa\s*(\d+(?:\.\d)?)|bgspsa\s*(\d+(?:\.\d)?)|raw|graded/i);
  let grade = null;
  if (gradeMatch) {
    if (gradeMatch[0].toLowerCase().includes('psa')) grade = 'PSA ' + (gradeMatch[1] || gradeMatch[2] || '');
    else if (gradeMatch[0].toLowerCase() === 'raw') grade = 'Raw';
  }
  
  return {
    player_name: playerName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    card_year: cardYear,
    card_set: cardSet ? cardSet.charAt(0).toUpperCase() + cardSet.slice(1) : null,
    card_number: null,
    variation: variation ? variation.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null,
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
           // Try multiple title sources
           const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"'<]+)["']/i)
             || html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
             || html.match(/"title"\s*:\s*"([^"]+)"/i)
             || html.match(/<title>([^<]+)<\/title>/i);
           if (titleMatch) scrapedTitle = titleMatch[1].replace(/ \| eBay.*$/i, '').trim();

           // Extract description which often has set/year/details
           const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"'<]+)["']/i);
           const description = descMatch ? descMatch[1].trim() : '';
           
           // Combine title + description for better LLM context
           if (description && !scrapedTitle.toLowerCase().includes(description.toLowerCase().split(' ')[0])) {
             scrapedTitle = scrapedTitle + ' ' + description.substring(0, 200);
           }

           // Try multiple patterns to extract asking price
           const pricePatterns = [
             /["']currentPrice["']\s*:\s*["']?\$?([\d,]+(?:\.\d{2})?)/i,
             /["']convertedCurrentPrice["']\s*:\s*["']?\$?([\d,]+(?:\.\d{2})?)/i,
             /\$\s*([\d,]+(?:\.\d{2})?)\s*<span[^>]*>current price/i,
             /Current price[^$]*?\$\s*([\d,]+(?:\.\d{2})?)/i,
             /Price:\s*\$\s*([\d,]+(?:\.\d{2})?)/i,
             /"price"\s*:\s*"?\$?([\d,]+(?:\.\d{2})?)"/i,
             /\$\s*([\d,]+(?:\.\d{2})?)</i
           ];
           
           for (const pattern of pricePatterns) {
             const priceMatch = html.match(pattern);
             if (priceMatch) {
               const price = parseFloat(priceMatch[1].replace(/,/g, ''));
               if (price > 0 && price < 1000000) { // sanity check
                 scrapedPrice = price;
                 break;
               }
             }
           }

           // Try to find sold prices / comps
           const soldMatch = html.match(/sold for\s*\$?\s*([\d,]+(?:\.\d{2})?)/i)
             || html.match(/sold\s+\$\s*([\d,]+(?:\.\d{2})?)/i);
           if (soldMatch) {
             const soldPrice = parseFloat(soldMatch[1].replace(/,/g, ''));
             if (soldPrice > 0) {
               scrapedPrice = soldPrice; // If we find a sold price, use it for asking
             }
           }

           const imgMatch = html.match(/https:\/\/i\.ebayimg\.com\/images\/g\/[^"'\s\\]+\/s-l[0-9]+\.(jpg|webp)/i);
           if (imgMatch) scrapedImage = imgMatch[0];
         }
       }
     } catch (_) {}
    }
    
    // Extract URL hints as fallback if scraping failed
    const urlHints = parseUrlHints(url);
    if (!scrapedTitle && urlHints.skw) {
      scrapedTitle = urlHints.skw;
    }

    // STRICT CARD IDENTIFICATION — Use LLM to parse scraped title ONLY
    let result = null;
    
    if (scrapedTitle) {
      try {
        const identificationResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Extract card info from this eBay listing text. Be thorough but accurate.

LISTING TEXT: "${scrapedTitle}"

Extract:
- player: Real player name (not brand/set name) — required
- set: Card set (Prizm, Optic, Select, Mosaic, etc)
- year: Card year (2023, 2023-24, etc)
- parallel: Color/variant (Silver, Green, Gold, Red, Cracked Ice, etc)
- card_number: Card # if present
- rookie: true if rookie or RC mentioned, false otherwise, null if unknown
- grade_company: PSA, BGS, SGC, CGC (if card is graded)
- grade_value: Grade number (10, 9.5, 8, etc)
- serial_number: Serial # if present

Rules:
1. Extract what's clearly stated
2. Player is REQUIRED — if no clear player name, return null for player
3. Do NOT infer or guess
4. Return JSON only, no markdown

{
  "player": "...",
  "set": "...",
  "year": "...",
  "parallel": "...",
  "card_number": "...",
  "rookie": true|false|null,
  "grade_company": "...",
  "grade_value": "...",
  "serial_number": "..."
}`,
          response_json_schema: {
            type: "object",
            properties: {
              player: { type: ["string", "null"] },
              set: { type: ["string", "null"] },
              year: { type: ["string", "null"] },
              parallel: { type: ["string", "null"] },
              card_number: { type: ["string", "null"] },
              rookie: { type: ["boolean", "null"] },
              grade_company: { type: ["string", "null"] },
              grade_value: { type: ["string", "null"] },
              serial_number: { type: ["string", "null"] }
            }
          },
          model: 'gemini_3_flash'
        });

        if (identificationResult?.player) {
          result = {
            player_name: identificationResult.player,
            card_year: identificationResult.year || null,
            card_set: identificationResult.set || null,
            card_number: identificationResult.card_number || null,
            variation: identificationResult.parallel || null,
            serial_number: identificationResult.serial_number || null,
            grade: identificationResult.grade_company && identificationResult.grade_value 
              ? `${identificationResult.grade_company} ${identificationResult.grade_value}` 
              : null,
            is_rookie_year: identificationResult.rookie || false,
            color_matches_team: !!identificationResult.parallel,
            has_autograph: false,
            has_patch: false,
            player_popularity: null,
          };
        }
      } catch (_) {}
    }
    
    // Fallback: If scraping got a bare title with no card info, use LLM web search
    if (!result && itemId && scrapedTitle && scrapedTitle.length > 0) {
      try {
        const webSearchResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You have an eBay listing title: "${scrapedTitle}"

Search the web if needed to understand what card this might be. Extract:
- player (real person name)
- set (Prizm, Optic, Select, etc)
- year
- parallel (if any color variant mentioned)
- card_number
- rookie (true/false/null)
- grade_company (PSA, BGS, SGC, CGC if graded)
- grade_value
- serial_number

If the title doesn't clearly indicate a card, return null for player and stop.
Return JSON only.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              player: { type: ["string", "null"] },
              set: { type: ["string", "null"] },
              year: { type: ["string", "null"] },
              parallel: { type: ["string", "null"] },
              card_number: { type: ["string", "null"] },
              rookie: { type: ["boolean", "null"] },
              grade_company: { type: ["string", "null"] },
              grade_value: { type: ["string", "null"] },
              serial_number: { type: ["string", "null"] }
            }
          },
          model: 'gemini_3_1_pro'
        });

        if (webSearchResult?.player) {
          result = {
            player_name: webSearchResult.player,
            card_year: webSearchResult.year || null,
            card_set: webSearchResult.set || null,
            card_number: webSearchResult.card_number || null,
            variation: webSearchResult.parallel || null,
            serial_number: webSearchResult.serial_number || null,
            grade: webSearchResult.grade_company && webSearchResult.grade_value 
              ? `${webSearchResult.grade_company} ${webSearchResult.grade_value}` 
              : null,
            is_rookie_year: webSearchResult.rookie || false,
            color_matches_team: !!webSearchResult.parallel,
            has_autograph: false,
            has_patch: false,
            player_popularity: null,
          };
        }
      } catch (_) {}
    }
    
    if (!result || !result.player_name) {
      return Response.json({
        error: 'Could not identify the card from this URL. Try a URL with card keywords or enter details manually.'
      }, { status: 422 });
    }

    // Add scraped pricing & image
    result.comp_value = null;
    result._comp_confidence = 'low';
    result._comp_sale_date = null;
    result.cheapest_available = scrapedPrice || null;
    result._ask_confidence = scrapedPrice ? 'medium' : 'low';
    result._ask_type = 'buy_it_now';
    result.image_url = scrapedImage || imageFromHash || null;

    // Grade assessment LLM (if we have image) — run in parallel with nothing else to await
    let aiGradeAssessment = null;
    if (result.image_url) {
     try {
       aiGradeAssessment = await base44.asServiceRole.integrations.Core.InvokeLLM({
         prompt: `Assess this sports card image condition briefly.
    Card: ${result.player_name} ${result.card_year || ''} ${result.card_set || ''}
    Return: estimated_grade, confidence (high/medium/low), key_observations (2-3 items array), grade_range`,
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
         model: 'gemini_3_flash',
       });
     } catch (_) {}
    }

    // Assign grade & eye appeal
    if (aiGradeAssessment) {
      result.ai_grade_assessment = aiGradeAssessment;
      result.ai_grade_disclosure = 'Our AI analyzes card images using PSA, BGS, and SGC grading standards. This is an estimated projection, not a guarantee. Actual graded results may differ based on professional examination and proprietary grader standards.';
      
      const obsText = (aiGradeAssessment.key_observations || []).join(' ').toLowerCase();
      const centeringScore = (() => {
        if (obsText.includes('excellent') || obsText.includes('very good') || obsText.includes('perfect')) return 95;
        if (obsText.includes('good') || obsText.includes('slight') && !obsText.includes('noticeable')) return 80;
        if (obsText.includes('noticeable') || obsText.includes('off')) return 55;
        if (obsText.includes('poor') || obsText.includes('very off')) return 20;
        return 70;
      })();
      
      const cornerScore = (() => {
        if (obsText.includes('sharp') || obsText.includes('very sharp') || (obsText.includes('corner') && obsText.includes('sharp'))) return 95;
        if (obsText.includes('minor wear') || obsText.includes('light wear')) return 80;
        if (obsText.includes('corner wear') || obsText.includes('wear') || obsText.includes('soft')) return 55;
        if (obsText.includes('damaged') || obsText.includes('heavy wear')) return 20;
        return 70;
      })();
      
      let eyeAppealGrade = 'B';
      if (centeringScore >= 90 && cornerScore >= 90) eyeAppealGrade = 'A';
      else if (centeringScore < 60 || cornerScore < 60) eyeAppealGrade = 'C';
      if (centeringScore < 40 && cornerScore < 40) eyeAppealGrade = 'D';
      
      result.ai_eye_appeal_grade = eyeAppealGrade;
      const centeringComment = centeringScore >= 90 ? 'Centering is excellent—image is perfectly positioned within the border.' : 
                               centeringScore >= 75 ? 'Centering is good—image sits well within the border with minimal drift.' : 
                               centeringScore >= 55 ? 'Centering shows noticeable drift—image is noticeably off-center, affecting visual appeal.' : 
                               'Centering is poor—image is significantly off-center, a major flaw for collectors.';
      result.eye_appeal_reasoning = `${centeringComment} Corners: ${cornerScore >= 90 ? 'sharp and clean' : cornerScore >= 75 ? 'show minor wear' : cornerScore >= 55 ? 'show visible wear' : 'heavily damaged'}.`;
    }



    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});