import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { playerName, cardYear, cardSet, grade, aiValue } = await req.json();
    
    if (!playerName) {
      return Response.json({ error: 'Player name required' }, { status: 400 });
    }

    // Search for live listings
    const searchResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Find the 5 best current buying opportunities for this basketball card on eBay, PWCC, Goldin, and COMC.

Card Details:
- Player: ${playerName}
- Year: ${cardYear || 'Any'}
- Set: ${cardSet || 'Any'}
- Grade: ${grade || 'Any'}

Return the 5 cheapest current listings with:
1. seller_name (platform + seller)
2. price (asking price)
3. url (direct link to listing)
4. grade_match (is grade exact match? yes/no/similar)
5. condition_notes (brief observation)

RULES:
- Only include active listings (not sold)
- Must be real, verifiable links
- Rank by lowest price first
- Return as JSON array

Return ONLY the JSON array, no markdown.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          listings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                seller_name: { type: "string" },
                price: { type: "number" },
                url: { type: "string" },
                grade_match: { type: "string" },
                condition_notes: { type: "string" }
              }
            }
          }
        }
      },
      model: 'gemini_3_1_pro'
    });

    if (!searchResult?.listings || searchResult.listings.length === 0) {
      return Response.json({
        listings: [],
        message: 'No current listings found. Try searching manually on eBay or PWCC.'
      });
    }

    // Score listings relative to AI value
    const scored = searchResult.listings.map(listing => ({
      ...listing,
      delta_vs_ai: listing.price && aiValue ? ((listing.price - aiValue) / aiValue * 100).toFixed(1) : null,
      is_below_ai: listing.price && aiValue ? listing.price < aiValue : false
    }));

    return Response.json({
      listings: scored,
      ai_value: aiValue,
      search_timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});