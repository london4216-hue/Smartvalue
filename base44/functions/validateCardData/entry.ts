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

    // Fast-path: if data looks clean (has player + year + set), skip LLM and return immediately
    const hasCleanData = cardData.player_name && cardData.card_year && cardData.card_set;
    const hasGrade = !cardData.grade || /^(PSA|BGS|SGC|CGC|Raw)\s*[\d.]*$/i.test((cardData.grade || '').trim());
    if (hasCleanData && hasGrade) {
      const colorMatch = detectTeamColorMatch(cardData.player_name, cardData.variation);
      return Response.json({
        ...cardData,
        color_matches_team: colorMatch,
        _validation_confidence: 'high',
        _validation_warnings: [],
        _validation_suggestions: [],
      });
    }

    // VALIDATION LAYER: Two models in parallel, reconcile for highest accuracy
    const validationPrompt = `You are a sports card data validator. A card extraction function returned this data. Validate and fix it.

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

RULES:
1. player_name MUST be a real NBA/sports player. Correct if wrong.
2. card_year MUST be 4 digits or season format (2020-21). Infer if missing.
3. card_set MUST be a real set (Prizm, Optic, Select, etc). Fix misspellings.
4. grade MUST be "PSA 10", "BGS 9.5", "Raw", etc. Fix if malformed.
5. serial_number MUST be a valid print run 1-10000. Null if invalid.
6. variation MUST be a real parallel. Null if wrong.

Return JSON only.`;

    const validationSchema = {
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
    };

    const [v1, v2] = await Promise.allSettled([
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: validationPrompt,
        response_json_schema: validationSchema,
        model: 'gemini_3_flash',
      }),
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: validationPrompt + '\n\nBe especially careful about grade format, serial number, and whether the player name is correct.',
        response_json_schema: validationSchema,
        model: 'gpt_5_mini',
      }),
    ]);

    const res1 = v1.status === 'fulfilled' ? v1.value : null;
    const res2 = v2.status === 'fulfilled' ? v2.value : null;

    // No sequential judge — pick the best answer from parallel results immediately.
    // For each field: if both agree, use that. If not, prefer the non-null / more specific value.
    const pick = (a, b) => (a === b ? a : null) ?? a ?? b;
    const validationResult = {
      is_valid: (res1?.is_valid ?? true) && (res2?.is_valid ?? true),
      player_name: res1?.player_name ?? res2?.player_name,
      card_year:   pick(res1?.card_year,   res2?.card_year),
      card_set:    pick(res1?.card_set,    res2?.card_set),
      grade:       pick(res1?.grade,       res2?.grade),
      variation:   pick(res1?.variation,   res2?.variation),
      serial_number: pick(res1?.serial_number, res2?.serial_number),
      is_rookie_year: res1?.is_rookie_year ?? res2?.is_rookie_year ?? false,
      has_autograph:  res1?.has_autograph  ?? res2?.has_autograph  ?? false,
      has_patch:      res1?.has_patch      ?? res2?.has_patch      ?? false,
      warnings: [...(res1?.warnings || []), ...(res2?.warnings || []).filter(w => !(res1?.warnings || []).includes(w))],
      confidence: (res1?.confidence === 'high' && res2?.confidence === 'high') ? 'high' : 'medium',
      suggestions: res1?.suggestions || res2?.suggestions || [],
    };

    if (!validationResult.is_valid || !validationResult.player_name) {
      return Response.json({
        error: 'Card data validation failed',
        details: validationResult.warnings || [],
        suggestions: validationResult.suggestions || []
      }, { status: 422 });
    }

    const colorMatch = detectTeamColorMatch(validationResult.player_name, validationResult.variation);

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
      _models_agreed: res1?.player_name === res2?.player_name && res1?.grade === res2?.grade,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});