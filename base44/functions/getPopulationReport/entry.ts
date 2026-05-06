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
      prompt: `Sports card pop report lookup. Use your training data knowledge — do NOT search the web.

Card: ${player_name} ${card_year || ''} ${card_set || ''} ${grade}

Estimate from known PSA/BGS/SGC population data:
- pop_at_grade: approx count graded at this exact grade
- total_pop_all_grades: approx total graded all grades
- pop_percentage: % at this grade
- highest_grade_achieved
- scarcity_assessment: common|uncommon|rare|very_rare|ultra_rare
- grader_breakdown: {PSA, BGS, SGC}
- source_confidence: high|medium|low
- notes: brief caveat

Return JSON only.`,
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
      add_context_from_internet: false,
      model: 'gemini_3_flash',
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});