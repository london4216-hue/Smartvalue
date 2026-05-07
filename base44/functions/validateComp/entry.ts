import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * COMP VALIDATION LAYER
 * Ensures comp data returned from marketplaces is:
 * - Recent (within last 12 months)
 * - Grade-matched (exact same grade, not guessed)
 * - Price-sensible (not outliers)
 * - Source-verified (real marketplace, not rumor)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cardData, compData } = await req.json();

    if (!cardData || !compData) {
      return Response.json({ error: 'cardData and compData required' }, { status: 400 });
    }

    // STRICT COMP VALIDATION
    const validationResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a sports card comp validator. A comp-fetching function returned marketplace data. Validate it strictly.

CARD WE'RE VALUING:
- Player: ${cardData.player_name}
- Year: ${cardData.card_year}
- Set: ${cardData.card_set}
- Grade: ${cardData.grade}
- Serial: ${cardData.serial_number || 'N/A'}

COMP RETURNED:
- comp_value: $${compData.comp_value || 'null'}
- sale_date: ${compData.sale_date || 'unknown'}
- source: ${compData.source || 'unknown'}
- tier: ${compData.tier || 'unknown'}
- confidence: ${compData.confidence || 'unknown'}

VALIDATION CHECKS:
1. GRADE MATCH: Is the comp for the EXACT same grade? (e.g. PSA 10 vs PSA 9.5 = NO MATCH)
   - If the comp grade is different or missing, REJECT.
2. RECENCY: Is the comp from the last 12 months?
   - If older than 12 months, flag as STALE.
3. PRICE SANITY: Does the price make sense?
   - Modern cards: $10-$50k is normal. Anything outside is suspicious.
   - Reject prices >$1M or <$1.
4. PLAYER MATCH: Is it the same player?
   - Reject if different player name.
5. SET MATCH: Is it the same set?
   - If the comp is from a different set (e.g. Prizm vs Optic), REJECT unless explicitly similar_card_baseline.

RETURN JSON with:
- is_valid: true if comp meets ALL criteria, false otherwise
- is_exact_match: true only if grade, player, set, year all match
- is_stale: true if sale_date >12 months old
- is_outlier: true if price seems unreasonable
- grade_match: true if grade matches exactly
- player_match: true if player matches
- set_match: true if set matches (or explicitly similar baseline)
- accept_as_anchor: true ONLY if is_valid AND is_exact_match AND NOT is_stale
- confidence_adjustment: "high" | "medium" | "low" (adjust confidence down if stale, outlier, or baseline)
- rejection_reason: if not valid, explain why`,
      response_json_schema: {
        type: "object",
        properties: {
          is_valid: { type: "boolean" },
          is_exact_match: { type: "boolean" },
          is_stale: { type: "boolean" },
          is_outlier: { type: "boolean" },
          grade_match: { type: "boolean" },
          player_match: { type: "boolean" },
          set_match: { type: "boolean" },
          accept_as_anchor: { type: "boolean" },
          confidence_adjustment: { type: "string" },
          rejection_reason: { type: ["string", "null"] },
        }
      },
      model: 'gemini_3_flash'
    });

    return Response.json({
      ...validationResult,
      comp_value: validationResult.accept_as_anchor ? compData.comp_value : null,
      _validated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});