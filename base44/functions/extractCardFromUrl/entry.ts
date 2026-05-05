import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await req.json();
    if (!url) {
      return Response.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch the actual page content
    let pageContent = '';
    try {
      const pageRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });
      const html = await pageRes.text();
      // Strip HTML tags and extract readable text (title + key content)
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';

      // Extract meta description
      const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      const metaDesc = metaMatch ? metaMatch[1] : '';

      // Extract h1
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const h1 = h1Match ? h1Match[1].trim() : '';

      // Extract price patterns
      const priceMatches = html.match(/\$[\d,]+\.?\d*/g) || [];
      const prices = [...new Set(priceMatches)].slice(0, 10).join(', ');

      // Extract item specifics / description text (strip tags, get text)
      const strippedText = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 4000);

      pageContent = `PAGE TITLE: ${title}\nH1: ${h1}\nMETA DESCRIPTION: ${metaDesc}\nPRICES FOUND: ${prices}\nPAGE TEXT: ${strippedText}`;
    } catch (fetchErr) {
      pageContent = `Could not fetch page directly. URL: ${url}`;
    }

    // Now call LLM with the actual page content
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a sports card data extractor. Extract card details from this eBay/card listing page content AND find recent sold comps.

SOURCE URL: ${url}

PAGE CONTENT (fetched directly):
${pageContent}

INSTRUCTIONS:
1. Read the PAGE TITLE and PAGE TEXT above carefully — this is the actual listing content.
2. Extract every card detail: player name, year, set, card number, variation/parallel, serial number, grade.
3. The price shown on the listing is the ASKING price (cheapest_available).
4. Now search the web for REAL completed/sold listings of this same card to find comp_value.
   - Search: "[player name] [year] [set] [variation] [grade] sold eBay"
   - Check 130point.com and cardladder.com
   - comp_value = what a buyer actually PAID (completed sale), NOT the asking price
5. comp_value and cheapest_available should almost always be different.

Return JSON:
- player_name: string (full player name from title)
- card_year: string
- card_set: string (brand/set name e.g. "Prizm", "National Treasures")
- card_number: string
- variation: string (parallel name only, no serial)
- serial_number: string or null (just number e.g. "75" for /75)
- grade: string (e.g. "PSA 10", "Raw")
- comp_value: number or null (real last SOLD price)
- cheapest_available: number or null (asking price from this listing)
- is_rookie_year: boolean
- color_matches_team: boolean
- has_autograph: boolean
- has_patch: boolean
- player_popularity: "rising" | "peak" | "legend" | "declining"`,
      response_json_schema: {
        type: "object",
        properties: {
          player_name: { type: "string" },
          card_year: { type: "string" },
          card_set: { type: "string" },
          card_number: { type: "string" },
          variation: { type: "string" },
          serial_number: { type: "string" },
          grade: { type: "string" },
          comp_value: { type: "number" },
          cheapest_available: { type: "number" },
          is_rookie_year: { type: "boolean" },
          color_matches_team: { type: "boolean" },
          has_autograph: { type: "boolean" },
          has_patch: { type: "boolean" },
          player_popularity: { type: "string" },
        }
      },
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
    });

    if (!result.player_name) {
      return Response.json({ error: 'Could not extract card details from this URL.' }, { status: 422 });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});