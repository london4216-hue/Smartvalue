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

// ─── TEAM COLOR MATCH DETECTION ──────────────────────────────────────────────
// Maps players (lowercased) to their team's primary colors for color match detection
const TEAM_COLORS = {
  // Boston Celtics — green, white
  'jayson tatum': ['green'], 'jaylen brown': ['green'], 'al horford': ['green'],
  'kristaps porzingis': ['green'], 'jrue holiday': ['green'],
  // LA Lakers — purple, gold/yellow
  'lebron james': ['purple', 'gold', 'yellow'], 'anthony davis': ['purple', 'gold', 'yellow'],
  'austin reaves': ['purple', 'gold', 'yellow'],
  // Golden State Warriors — blue, gold/yellow
  'stephen curry': ['blue', 'gold', 'yellow'], 'klay thompson': ['blue', 'gold', 'yellow'],
  'draymond green': ['blue', 'gold', 'yellow'],
  // Miami Heat — red, black, yellow/gold
  'jimmy butler': ['red', 'black'], 'bam adebayo': ['red', 'black'],
  // Milwaukee Bucks — green
  'giannis antetokounmpo': ['green'], 'damian lillard': ['green'],
  // Denver Nuggets — blue, gold
  'nikola jokic': ['blue', 'gold', 'yellow'], 'jamal murray': ['blue', 'gold', 'yellow'],
  // Phoenix Suns — purple, orange
  'kevin durant': ['purple', 'orange'], 'devin booker': ['purple', 'orange'],
  // Brooklyn Nets — black, white
  'ben simmons': ['black', 'white'],
  // Dallas Mavericks — blue, silver
  'luka doncic': ['blue', 'silver'], 'kyrie irving': ['blue', 'silver'],
  // Memphis Grizzlies — blue
  'ja morant': ['blue'],
  // Chicago Bulls — red, black
  'zach lavine': ['red', 'black'], 'demar derozan': ['red', 'black'],
  // Philadelphia 76ers — blue, red
  'joel embiid': ['blue', 'red'], 'tyrese maxey': ['blue', 'red'],
  // New York Knicks — orange, blue
  'julius randle': ['orange', 'blue'], 'jalen brunson': ['orange', 'blue'],
  // OKC Thunder — blue, orange
  'shai gilgeous-alexander': ['blue', 'orange'],
  // Sacramento Kings — purple
  'domantas sabonis': ['purple'], 'de aaron fox': ['purple'],
};

function detectTeamColorMatch(playerName, parallel) {
  if (!playerName || !parallel) return false;
  const playerKey = playerName.toLowerCase().trim();
  const parallelLower = parallel.toLowerCase();
  const teamColors = TEAM_COLORS[playerKey];
  if (!teamColors) return false;
  return teamColors.some(color => parallelLower.includes(color));
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

    // Fetch eBay page with a tight timeout to avoid hanging
    if (itemId) {
     try {
        const res = await fetch(`https://www.ebay.com/itm/${itemId}`, {
         headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0' },
         signal: AbortSignal.timeout(5000),
       });
       if (res.ok) {
         const html = await res.text();
         if (!html.includes('Access Denied') && html.length > 500) {
           const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"'<]+)["']/i)
             || html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
             || html.match(/"title"\s*:\s*"([^"]+)"/i)
             || html.match(/<title>([^<]+)<\/title>/i);
           if (titleMatch) scrapedTitle = titleMatch[1].replace(/ \| eBay.*$/i, '').trim();

           const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"'<]+)["']/i);
           const description = descMatch ? descMatch[1].trim() : '';
           if (description && !scrapedTitle.toLowerCase().includes(description.toLowerCase().split(' ')[0])) {
             scrapedTitle = scrapedTitle + ' ' + description.substring(0, 200);
           }

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
               if (price > 0 && price < 1000000) { scrapedPrice = price; break; }
             }
           }

           const soldMatch = html.match(/sold for\s*\$?\s*([\d,]+(?:\.\d{2})?)/i)
             || html.match(/sold\s+\$\s*([\d,]+(?:\.\d{2})?)/i);
           if (soldMatch) {
             const soldPrice = parseFloat(soldMatch[1].replace(/,/g, ''));
             if (soldPrice > 0) scrapedPrice = soldPrice;
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

    // STRICT CARD IDENTIFICATION — Two models in parallel, reconciled for accuracy
    let result = null;

    const cardIdSchema = {
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
    };

    if (scrapedTitle) {
      try {
        const idPrompt = `Extract card details from this listing text. Return JSON only, no markdown.

LISTING: "${scrapedTitle}"

Extract:
- player: Real NBA/sports player name — required, null if unclear
- set: Card set (Prizm, Optic, Select, Mosaic, National Treasures, etc)
- year: Card year (2023, 2023-24, etc)
- parallel: Color/variant (Silver, Green, Gold, Red, Cracked Ice, Hyper, etc)
- card_number: Card # if present
- rookie: true if RC/Rookie mentioned, false otherwise, null if unknown
- grade_company: PSA, BGS, SGC, CGC if graded — null otherwise
- grade_value: Grade number (10, 9.5, 8, etc) — null if not graded
- serial_number: Print run number only (e.g. 25 for /25) — null if not serialized`;

        // Run Gemini + GPT in parallel for dual-model card identification
        const [r1, r2] = await Promise.allSettled([
          base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: idPrompt,
            response_json_schema: cardIdSchema,
            model: 'gemini_3_flash',
          }),
          base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: idPrompt + '\n\nDouble-check your answer — be precise about grade, serial number, and parallel.',
            response_json_schema: cardIdSchema,
            model: 'gpt_5_mini',
          }),
        ]);

        const id1 = r1.status === 'fulfilled' ? r1.value : null;
        const id2 = r2.status === 'fulfilled' ? r2.value : null;

        // For card ID from a listing title, prefer whichever model got a player name.
        // For critical specifics (grade, serial), prefer the one that's more specific (non-null wins).
        // No judge needed here — the listing text is the ground truth.
        const reconciled = {
          player:        id1?.player        || id2?.player        || null,
          set:           id1?.set           || id2?.set           || null,
          year:          id1?.year          || id2?.year          || null,
          parallel:      id1?.parallel === id2?.parallel ? id1?.parallel : (id1?.parallel || id2?.parallel || null),
          card_number:   id1?.card_number   || id2?.card_number   || null,
          rookie:        id1?.rookie        ?? id2?.rookie        ?? false,
          grade_company: id1?.grade_company === id2?.grade_company ? id1?.grade_company : (id1?.grade_company || id2?.grade_company || null),
          grade_value:   id1?.grade_value   === id2?.grade_value   ? id1?.grade_value   : (id1?.grade_value   || id2?.grade_value   || null),
          serial_number: id1?.serial_number === id2?.serial_number ? id1?.serial_number : (id1?.serial_number || id2?.serial_number || null),
        };

        if (reconciled.player) {
          const parallel = reconciled.parallel || null;
          result = {
            player_name: reconciled.player,
            card_year: reconciled.year || null,
            card_set: reconciled.set || null,
            card_number: reconciled.card_number || null,
            variation: parallel,
            serial_number: reconciled.serial_number || null,
            grade: reconciled.grade_company && reconciled.grade_value
              ? `${reconciled.grade_company} ${reconciled.grade_value}`
              : null,
            is_rookie_year: reconciled.rookie || false,
            color_matches_team: detectTeamColorMatch(reconciled.player, parallel),
            has_autograph: false,
            has_patch: false,
            player_popularity: null,
            _id_models_agreed: id1?.player === id2?.player && id1?.grade_value === id2?.grade_value,
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
          const parallel = webSearchResult.parallel || null;
          result = {
            player_name: webSearchResult.player,
            card_year: webSearchResult.year || null,
            card_set: webSearchResult.set || null,
            card_number: webSearchResult.card_number || null,
            variation: parallel,
            serial_number: webSearchResult.serial_number || null,
            grade: webSearchResult.grade_company && webSearchResult.grade_value 
              ? `${webSearchResult.grade_company} ${webSearchResult.grade_value}` 
              : null,
            is_rookie_year: webSearchResult.rookie || false,
            color_matches_team: detectTeamColorMatch(webSearchResult.player, parallel),
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

    // Eye Appeal Assessment — runs in parallel, don't await until needed
    const gradePromise = result.image_url
      ? base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are analyzing a sports card image for EYE APPEAL only — centering and corner wear.
You are NOT a grading company. Do NOT claim to predict PSA/BGS grades.

Assess ONLY:
1. centering_description: 1 sentence describing how centered the image is within the borders (left/right/top/bottom balance)
2. centering_score: 0-100 (100=perfect 50/50, 70=slight drift, 40=noticeable off-center, 20=heavily off-center)
3. corners_description: 1 sentence describing the 4 corners (sharp, light wear, visible wear, heavy wear)
4. corners_score: 0-100 (100=razor sharp, 80=very slight wear, 60=some wear, 40=visible wear, 20=heavy damage)
5. eye_appeal_grade: A (centering≥85 AND corners≥85), B (both≥65), C (either <65), D (either <40)
6. eye_appeal_summary: 1-2 sentence combined eye appeal summary mentioning only centering and corners

Return JSON only.`,
          response_json_schema: {
            type: "object",
            properties: {
              centering_description: { type: "string" },
              centering_score: { type: "number" },
              corners_description: { type: "string" },
              corners_score: { type: "number" },
              eye_appeal_grade: { type: "string" },
              eye_appeal_summary: { type: "string" },
            }
          },
          file_urls: [result.image_url],
          model: 'gemini_3_flash',
        }).catch(() => null)
      : Promise.resolve(null);

    const eyeAppealData = await gradePromise;

    if (eyeAppealData) {
      result.ai_grade_assessment = {
        key_observations: [
          eyeAppealData.centering_description,
          eyeAppealData.corners_description,
        ].filter(Boolean),
        centering_score: eyeAppealData.centering_score,
        corners_score: eyeAppealData.corners_score,
      };
      // STRICT DISCLOSURE: centering and corners only, not a grading company
      result.ai_grade_disclosure = 'Eye appeal score reflects centering and corner wear only as seen in this image. We are not a grading company — this is not a professional grade. Actual PSA/BGS/SGC results may differ significantly based on physical inspection under proper lighting.';
      result.ai_eye_appeal_grade = eyeAppealData.eye_appeal_grade || 'B';
      result.eye_appeal_reasoning = eyeAppealData.eye_appeal_summary || '';
      result._eye_appeal_scores = {
        centering: eyeAppealData.centering_score,
        corners: eyeAppealData.corners_score,
      };
    }



    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});