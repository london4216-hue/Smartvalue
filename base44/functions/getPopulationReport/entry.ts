import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { player_name, card_year, card_set, grade } = await req.json();

    if (!player_name || !grade) {
      return Response.json({
        error: 'Missing required fields: player_name, grade'
      }, { status: 400 });
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a sports card population report expert. Look up the CURRENT population report data for:

Player: ${player_name}
Year: ${card_year || 'any'}
Set: ${card_set || 'any'}
Grade: ${grade}

Search PSA, BGS, and SGC population databases to find:
1. Total number of cards graded at THIS EXACT GRADE (e.g., PSA 9, BGS 9.5, SGC 10)
2. Total population at this grade across all graders (PSA + BGS + SGC combined if available)
3. Grading company breakdown if available
4. Highest grade achieved for this card (if known)
5. Estimated scarcity tier (common/uncommon/rare/very rare/ultra rare)

Return JSON with:
- grading_company (e.g., PSA, BGS, SGC)
- grade_requested: "${grade}"
- pop_at_grade: number (how many graded at this exact grade)
- total_pop_all_grades: number (total ever graded, all grades)
- pop_percentage: number (percent at this grade out of total pop)
- highest_grade_achieved: string
- scarcity_assessment: string (one of: common, uncommon, rare, very_rare, ultra_rare)
- grader_breakdown: { PSA: number, BGS: number, SGC: number } (if available)
- source_confidence: string (high/medium/low)
- notes: string (any caveats about data freshness)`,
      response_json_schema: {
        type: "object",
        properties: {
          grading_company: { type: "string" },
          grade_requested: { type: "string" },
          pop_at_grade: { type: "number" },
          total_pop_all_grades: { type: "number" },
          pop_percentage: { type: "number" },
          highest_grade_achieved: { type: "string" },
          scarcity_assessment: { type: "string" },
          grader_breakdown: {
            type: "object",
            properties: {
              PSA: { type: "number" },
              BGS: { type: "number" },
              SGC: { type: "number" }
            }
          },
          source_confidence: { type: "string" },
          notes: { type: "string" }
        }
      },
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});