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
           const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"'<]+)["']/i)
             || html.match(/<title>([^<]+)<\/title>/i);
           if (titleMatch) scrapedTitle = titleMatch[1].replace(/ \| eBay.*$/i, '').trim();

           // Try multiple patterns to extract current price
           const pricePatterns = [
             /["']convertedCurrentPrice["']\s*:\s*["']?\$?([\d,]+(?:\.\d{2})?)/i,
             /["']currentPrice["']\s*:\s*["']?([\d,]+(?:\.\d{2})?)/i,
             /[\$£€]([\d,]+(?:\.\d{2})?)\s*(?:or|buy|offer)/i,
             />[\$]([\d,]+(?:\.\d{2})?)<\/span>/i,
             /Current price[^$]*\$\s*([\d,]+(?:\.\d{2})?)/i
           ];
           
           for (const pattern of pricePatterns) {
             const priceMatch = html.match(pattern);
             if (priceMatch) {
               scrapedPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
               if (scrapedPrice > 0) break;
             }
           }

           const imgMatch = html.match(/https:\/\/i\.ebayimg\.com\/images\/g\/[^"'\s\\]+\/s-l[0-9]+\.(jpg|webp)/i);
           if (imgMatch) scrapedImage = imgMatch[0];
         }
       }
     } catch (_) {}
    }

    // Parse keywords first (most reliable for eBay _skw)
    let result = null;
    if (skw) {
      result = parseCardFromKeywords(skw);
      // Extra validation: player name should not be a single brand name
      const badNames = ['panini', 'prizm', 'optic', 'select', 'mosaic', 'topps', 'donruss', 'hoops'];
      if (result && result.player_name && badNames.includes(result.player_name.toLowerCase())) {
        result = null;
      }
    }
    
    // If keyword parsing failed, try web search as fallback
    if (!result && itemId) {
      try {
        const searchResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Visit https://www.ebay.com/itm/${itemId} and extract these fields exactly as shown:
- player_name: Basketball player name (a real person, e.g., "Victor Wembanyama")
- card_year: Year (e.g., "2023")
- card_set: Card set (e.g., "Prizm")
- variation: Variant (e.g., "Silver", "Cracked Ice")
- grade: Grade if shown
- asking_price: Current price (numeric, 1-100000)

Do NOT confuse brand names (Panini, Prizm) with player names. Return only the JSON.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              player_name: { type: ["string", "null"] },
              card_year: { type: ["string", "null"] },
              card_set: { type: ["string", "null"] },
              variation: { type: ["string", "null"] },
              grade: { type: ["string", "null"] },
              asking_price: { type: ["number", "null"] }
            }
          },
          model: 'gemini_3_1_pro'
        });
        
        const badNames = ['panini', 'prizm', 'optic', 'select', 'mosaic', 'topps'];
        const isValidPlayer = searchResult?.player_name && 
          !badNames.some(b => searchResult.player_name.toLowerCase().includes(b));
        
        if (isValidPlayer) {
          result = {
            player_name: searchResult.player_name,
            card_year: searchResult.card_year || null,
            card_set: searchResult.card_set || null,
            card_number: null,
            variation: searchResult.variation || null,
            serial_number: null,
            grade: searchResult.grade || null,
            is_rookie_year: /2023|rookie|rc/i.test(searchResult.card_year || ''),
            color_matches_team: !!searchResult.variation,
            has_autograph: false,
            has_patch: false,
            player_popularity: null,
          };
          if (searchResult.asking_price && searchResult.asking_price > 0) {
            scrapedPrice = searchResult.asking_price;
          }
        }
      } catch (_) {}
    }
    
    // Fallback to title parsing if still no result
    if (!result && scrapedTitle) {
      result = parseCardFromKeywords(scrapedTitle);
    }
    
    if (!result || !result.player_name) {
      return Response.json({
        error: 'Could not identify the card from this URL. Try a URL with card keywords or enter details manually.'
      }, { status: 422 });
    }

    // Init pricing with defaults
    let pricingValidation = {
      pricing: {
        last_sold_price_amount: null,
        last_sold_price_currency: "USD",
        last_sold_price_date: null,
        last_sold_price_source: "eBay",
        last_sold_price_confidence: "low",
        current_ask_price_amount: scrapedPrice || null,
        current_ask_price_currency: "USD",
        current_ask_source: "eBay",
        current_ask_type: "buy_it_now",
        current_ask_confidence: scrapedPrice ? "medium" : "low"
      }
    };

    // Add pricing & image first
    result.comp_value = pricingValidation.pricing.last_sold_price_amount;
    result._comp_confidence = pricingValidation.pricing.last_sold_price_confidence;
    result._comp_sale_date = pricingValidation.pricing.last_sold_price_date;
    result.cheapest_available = pricingValidation.pricing.current_ask_price_amount;
    result._ask_confidence = pricingValidation.pricing.current_ask_confidence;
    result._ask_type = pricingValidation.pricing.current_ask_type;
    result.image_url = scrapedImage || imageFromHash || null;

    // Parallelize pricing validation + grade assessment
    const promises = [];

    // Pricing LLM (if we have itemId) — ask for current asking price + comps
    if (itemId && result?.player_name) {
      promises.push(
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Go to https://www.ebay.com/itm/${itemId} and extract:
1. Current asking price (the price shown on this eBay listing right now)
2. Price type (buy_it_now or auction)
3. Most recent comparable sale price for the same card

Card: ${result.player_name} ${result.card_year || ''} ${result.card_set || ''} ${result.variation || ''} ${result.grade || ''}`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              current_ask_price_amount: { type: ["number", "null"] },
              current_ask_type: { type: ["string", "null"] },
              last_sold_price_amount: { type: ["number", "null"] },
              last_sold_price_date: { type: ["string", "null"] }
            }
          },
          model: 'gemini_3_1_pro'
        }).catch(() => null)
      );
    }

    // Grade assessment LLM (if we have image)
    if (result.image_url) {
      promises.push(
        base44.asServiceRole.integrations.Core.InvokeLLM({
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
        }).catch(() => null)
      );
    }

    // Wait for all LLM calls in parallel
    const llmResults = await Promise.all(promises);
    let resultIdx = 0;

    // Assign pricing result — prefer LLM result, fallback to scraped price
    if (itemId && result?.player_name && llmResults[resultIdx]) {
      const pricingResult = llmResults[resultIdx];
      if (pricingResult) {
        result.comp_value = pricingResult.last_sold_price_amount;
        result._comp_confidence = pricingResult.last_sold_price_amount ? 'medium' : 'low';
        result._comp_sale_date = pricingResult.last_sold_price_date;
        result.cheapest_available = pricingResult.current_ask_price_amount || scrapedPrice || null;
        result._ask_confidence = (pricingResult.current_ask_price_amount || scrapedPrice) ? 'high' : 'low';
        result._ask_type = pricingResult.current_ask_type || 'buy_it_now';
      }
      resultIdx++;
    }

    // Assign grade result
    let aiGradeAssessment = null;
    if (result.image_url && llmResults[resultIdx]) {
      aiGradeAssessment = llmResults[resultIdx];
    }

    if (aiGradeAssessment) {
      result.ai_grade_assessment = aiGradeAssessment;
      result.ai_grade_disclosure = 'Our AI analyzes card images using PSA, BGS, and SGC grading standards. This is an estimated projection, not a guarantee. Actual graded results may differ based on professional examination and proprietary grader standards.';
      
      // Compute AI Eye-Appeal Grade (A/B/C/D) based on centering + corners
      // ALWAYS COMMENT ON CENTERING: Card centering is one of the most critical visual factors
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
      
      // Assign eye-appeal grade
      let eyeAppealGrade = 'B';
      if (centeringScore >= 90 && cornerScore >= 90) eyeAppealGrade = 'A';
      else if (centeringScore < 60 || cornerScore < 60) eyeAppealGrade = 'C';
      if (centeringScore < 40 && cornerScore < 40) eyeAppealGrade = 'D';
      
      result.ai_eye_appeal_grade = eyeAppealGrade;
      // ALWAYS include centering comment as a rule - it's critical for collector appeal
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