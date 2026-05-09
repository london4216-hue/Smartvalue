import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Team color match detection (same logic as extractCardFromUrl)
const TEAM_COLORS = {
  'jayson tatum': ['green'], 'jaylen brown': ['green'], 'al horford': ['green'],
  'lebron james': ['purple', 'gold', 'yellow'], 'anthony davis': ['purple', 'gold', 'yellow'],
  'stephen curry': ['blue', 'gold', 'yellow'], 'klay thompson': ['blue', 'gold', 'yellow'],
  'draymond green': ['blue', 'gold', 'yellow'],
  'jimmy butler': ['red', 'black'], 'bam adebayo': ['red', 'black'],
  'giannis antetokounmpo': ['green'], 'damian lillard': ['green'],
  'nikola jokic': ['blue', 'gold', 'yellow'], 'jamal murray': ['blue', 'gold', 'yellow'],
  'kevin durant': ['purple', 'orange'], 'devin booker': ['purple', 'orange'],
  'luka doncic': ['blue', 'silver'], 'kyrie irving': ['blue', 'silver'],
  'ja morant': ['blue'],
  'zach lavine': ['red', 'black'], 'demar derozan': ['red', 'black'],
  'joel embiid': ['blue', 'red'], 'tyrese maxey': ['blue', 'red'],
  'julius randle': ['orange', 'blue'], 'jalen brunson': ['orange', 'blue'],
  'shai gilgeous-alexander': ['blue', 'orange'],
  'domantas sabonis': ['purple'], 'de aaron fox': ['purple'],
};

function detectTeamColorMatch(playerName, parallel) {
  if (!playerName || !parallel) return false;
  const key = playerName.toLowerCase().trim();
  const p = parallel.toLowerCase();
  const colors = TEAM_COLORS[key];
  return colors ? colors.some(c => p.includes(c)) : false;
}

/**
 * CRITICAL DATA VALIDATION LAYER
 * Ensures card data entering the valuation engine is clean, complete, and verified.
 * Runs AFTER extraction, BEFORE comp fetching and valuation.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const cardData = await req.json();

    if (!cardData.player_name) {
      return Response.json({ error: 'player_name is required' }, { status: 400 });
    }

    // VALIDATION LAYER: Run strict LLM re-check on extracted card data
    const validationResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a sports card data validator. A card extraction function returned this data. Your job is to validate and fix it.

EXTRACTED DATA:
- player_name: ${cardData.player_name || 'null'}
- card_year: ${cardData.card_year || 'null'}
- card_set: ${cardData.card_set || 'null'}
- variation: ${cardData.variation || 'null'}
- grade: ${cardData.grade || 'null'}
- serial_number: ${cardData.serial_number || 'null'}
- is_rookie_year: ${cardData.is_rookie_year || 'false'}
- has_autograph: ${cardData.has_autograph || 'false'}
- has_patch: ${cardData.has_patch || 'false'}

VALIDATION RULES:
1. Player name MUST be a real NBA/sports player (not a team, set name, or brand). If wrong, CORRECT it.
2. Card year MUST be 4 digits (2020-2025) or season format (2020-21). If missing or wrong, try to infer.
3. Card set MUST be a real set (Prizm, Optic, Select, Mosaic, etc). If misspelled, correct it.
4. Grade MUST be format like "PSA 10", "BGS 9.5", "Raw", etc. If malformed, fix it.
5. Serial number MUST be a valid print run (1-10000). If invalid, set to null.
6. Variation MUST be a real parallel (Silver, Gold, Cracked Ice, etc). If wrong, nullify.

RETURN JSON with:
- is_valid: true if data is clean and usable, false if fatal errors
- player_name: corrected player name
- card_year: corrected year or null
- card_set: corrected set or null
- grade: corrected grade or null
- variation: corrected variation or null
- serial_number: valid number or null
- is_rookie_year: boolean
- has_autograph: boolean
- has_patch: boolean
- warnings: array of issues found and fixed (e.g. ["Player name was blank, kept as extracted", "Grade was malformed, corrected to PSA 10"])
- confidence: "high" if data is clean, "medium" if minor fixes applied, "low" if multiple corrections needed
- suggestions: array of optional follow-ups (e.g. "Verify serial number in photos")`,
      response_json_schema: {
        type: "object",
        properties: {
          is_valid: { type: "boolean" },
          player_name: { type: "string" },
          card_year: { type: ["string", "null"] },
          card_set: { type: ["string", "null"] },
          grade: { type: ["string", "null"] },
          variation: { type: ["string", "null"] },
          serial_number: { type: ["string", "null"] },
          is_rookie_year: { type: "boolean" },
          has_autograph: { type: "boolean" },
          has_patch: { type: "boolean" },
          warnings: { type: "array", items: { type: "string" } },
          confidence: { type: "string" },
          suggestions: { type: "array", items: { type: "string" } },
        }
      },
      model: 'gemini_3_flash'
    });

    if (!validationResult.is_valid || !validationResult.player_name) {
      return Response.json({
        error: 'Card data validation failed',
        details: validationResult.warnings || [],
        suggestions: validationResult.suggestions || []
      }, { status: 422 });
    }

    const colorMatch = detectTeamColorMatch(validationResult.player_name, validationResult.variation);

    // Return cleaned & validated card data
    return Response.json({
      ...cardData,
      player_name: validationResult.player_name,
      card_year: validationResult.card_year,
      card_set: validationResult.card_set,
      grade: validationResult.grade,
      variation: validationResult.variation,
      serial_number: validationResult.serial_number,
      is_rookie_year: validationResult.is_rookie_year,
      has_autograph: validationResult.has_autograph,
      has_patch: validationResult.has_patch,
      color_matches_team: colorMatch,
      _validation_confidence: validationResult.confidence,
      _validation_warnings: validationResult.warnings,
      _validation_suggestions: validationResult.suggestions,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});