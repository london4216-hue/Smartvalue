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
    
    // Check if parse looks suspicious (e.g. "sticky" in player name from bad _skw tag)
    const isSuspiciousParse = result && result.player_name && result.player_name.toLowerCase().includes('sticky');
    
    // If no success, suspicious parse, or bare link (no keywords), always try web search
    const isBareLink = itemId && !skw;
    const noValidPrice = !scrapedPrice || scrapedPrice === 0;
    
    if (((!result || !result.player_name) || isSuspiciousParse || isBareLink || noValidPrice) && itemId) {
      try {
        const searchResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Fetch the eBay listing at ebay.com/itm/${itemId}. Extract:
1. Full listing title
2. Current asking price (BIN or auction price) - MUST be a number, look carefully at the page
3. Basketball player name
4. Card year (e.g., 2023)
5. Card set name (e.g., Prizm, Optic, Select)
6. Grade if shown (e.g., PSA 9, BGS 10, Raw)

Be precise—this is a sports card. Return as JSON.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              player_name: { type: "string" },
              card_year: { type: "string" },
              card_set: { type: "string" },
              grade: { type: "string" },
              asking_price: { type: "number" }
            }
          },
          model: 'gemini_3_1_pro'
        });
        if (searchResult?.player_name && searchResult.player_name !== 'Unknown') {
          dataToAnalyze = `${searchResult.player_name} ${searchResult.card_year || ''} ${searchResult.card_set || ''} ${searchResult.grade || ''}`;
          result = parseCardFromKeywords(dataToAnalyze);
          if (searchResult?.asking_price && searchResult.asking_price >= 1 && searchResult.asking_price <= 100000) {
            scrapedPrice = searchResult.asking_price;
          }
        }
      } catch (err) {
        // Web search failed silently—continue with manual parse
      }
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

    // Pricing LLM (if we have itemId)
    if (itemId && result?.player_name) {
      promises.push(
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `SYSTEM INSTRUCTION — FOLLOW EXACTLY.
OUTPUT JSON ONLY.
NO MARKDOWN.
NO COMMENTARY.

Card Details:
- Player: ${result.player_name}
- Set: ${result.card_set || 'Unknown'}
- Grade: ${result.grade || 'Unknown'}
- Year: ${result.card_year || 'Unknown'}

URL: ebay.com/itm/${itemId}

Your #1 priority is to correctly identify:
1) The most recent clean sale price for this exact card (Last Sale Price)
2) The current listing price from the URL (Current Ask Price)

RULES FOR LAST SALE PRICE:
- Must be the most recent completed sale
- Same player, same set, same parallel, same grade (or closest equivalent)
- From a real marketplace (eBay, Goldin, PWCC, etc.)
- Return: last_sold_price_amount, last_sold_price_currency, last_sold_price_date, last_sold_price_source
- If NOT confident: set last_sold_price_confidence = "low"

RULES FOR CURRENT ASK PRICE:
- Must come from the listing tied to the URL
- NOT from a comp
- NOT from another card
- Return: current_ask_price_amount, current_ask_price_currency, current_ask_source, current_ask_type
- If missing: set current_ask_price_amount = null and current_ask_confidence = "low"

SANITY CHECKS:
- If price <= 0 → treat as missing; set confidence = "low"
- NEVER copy last_sold into current_ask or vice versa
- NEVER use AI Value as either price

Return ONLY this JSON structure:
{
  "pricing": {
    "last_sold_price_amount": null or number,
    "last_sold_price_currency": "USD",
    "last_sold_price_date": "YYYY-MM-DD" or null,
    "last_sold_price_source": "eBay" or other,
    "last_sold_price_confidence": "high" or "medium" or "low",
    "current_ask_price_amount": null or number,
    "current_ask_price_currency": "USD",
    "current_ask_source": "eBay",
    "current_ask_type": "auction" or "buy_it_now" or "best_offer",
    "current_ask_confidence": "high" or "medium" or "low"
  }
}`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              pricing: {
                type: "object",
                properties: {
                  last_sold_price_amount: { type: ["number", "null"] },
                  last_sold_price_currency: { type: "string" },
                  last_sold_price_date: { type: ["string", "null"] },
                  last_sold_price_source: { type: "string" },
                  last_sold_price_confidence: { type: "string" },
                  current_ask_price_amount: { type: ["number", "null"] },
                  current_ask_price_currency: { type: "string" },
                  current_ask_source: { type: "string" },
                  current_ask_type: { type: "string" },
                  current_ask_confidence: { type: "string" }
                }
              }
            }
          },
          model: 'gemini_3_1_pro'
        }).catch(() => null)
      );
    }

    // Grade assessment LLM (if we have image)
    let aiGradeAssessment = null;
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
    const results = await Promise.all(promises);
    let resultIdx = 0;

    // Assign pricing result
    if (itemId && result?.player_name && results[resultIdx]) {
      const pricingResult = results[resultIdx];
      if (pricingResult?.pricing) {
        pricingValidation = pricingResult;
        result.comp_value = pricingValidation.pricing.last_sold_price_amount;
        result._comp_confidence = pricingValidation.pricing.last_sold_price_confidence;
        result._comp_sale_date = pricingValidation.pricing.last_sold_price_date;
        result.cheapest_available = pricingValidation.pricing.current_ask_price_amount;
        result._ask_confidence = pricingValidation.pricing.current_ask_confidence;
        result._ask_type = pricingValidation.pricing.current_ask_type;
      }
      resultIdx++;
    }

    // Assign grade result
    if (result.image_url && results[resultIdx]) {
      aiGradeAssessment = results[resultIdx];
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