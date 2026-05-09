import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { player_name, card_year, card_set, grade, cert_number } = await req.json();

    if (!player_name || !grade) {
      return Response.json({
        error: 'Missing required fields: player_name, grade'
      }, { status: 400 });
    }

    const gradeCompany = grade.toUpperCase().startsWith('BGS') ? 'BGS' : grade.toUpperCase().startsWith('SGC') ? 'SGC' : 'PSA';

    // If we have a cert number, try direct PSA API lookup first
    if (cert_number && gradeCompany === 'PSA') {
      try {
        const certClean = cert_number.toString().replace(/\D/g, '');
        const psaRes = await fetch(`https://api.psacard.com/publicapi/cert/GetByCertNumber/${certClean}`, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
        });
        if (psaRes.ok) {
          const psaData = await psaRes.json();
          const cert = psaData?.PSACert || psaData;
          if (cert?.CardGrade) {
            // PSA cert endpoint gives us card info; use web search for pop numbers
            const popResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
              prompt: `Look up the PSA population report for: ${player_name} ${card_year || ''} ${card_set || ''} ${grade}
Search psacard.com/pop for the exact current pop numbers.
Return JSON: pop_at_grade, pop_higher (copies graded HIGHER than this grade — shown as "Pop Higher" on PSA cert screens, 0 if none), total_pop_all_grades, scarcity_assessment (ultra_rare/very_rare/rare/uncommon/common), grader_breakdown {PSA, BGS, SGC}, highest_grade_achieved (the highest grade any copy has received), source_confidence, notes`,
              add_context_from_internet: true,
              response_json_schema: {
                type: "object",
                properties: {
                  pop_at_grade: { type: "number" },
                  pop_higher: { type: ["number", "null"] },
                  total_pop_all_grades: { type: "number" },
                  pop_percentage: { type: "number" },
                  highest_grade_achieved: { type: "string" },
                  scarcity_assessment: { type: "string" },
                  grader_breakdown: { type: "object", properties: { PSA: { type: "number" }, BGS: { type: "number" }, SGC: { type: "number" } } },
                  source_confidence: { type: "string" },
                  notes: { type: "string" }
                }
              },
              model: 'gemini_3_flash',
            });
            return Response.json({ ...popResult, grade_requested: grade, grading_company: 'PSA' });
          }
        }
      } catch (_) {}
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Look up the LIVE current population report for this sports card on the ${gradeCompany} registry website.

Card: ${player_name} ${card_year || ''} ${card_set || ''} ${grade}

Search for the actual current pop report at:
- PSA: https://www.psacard.com/pop/
- BGS: https://www.beckett.com/grading/pop-reports
- SGC: https://www.sgccard.com/pop-report

Find the REAL current numbers for:
- pop_at_grade: exact count graded at ${grade} specifically
- pop_higher: CRITICAL — number of copies graded HIGHER than ${grade} (e.g. if grade is PSA 9, pop_higher = all PSA 10 copies). This is shown as "Pop Higher" on PSA cert lookup screens. Return 0 if none, null if unknown.
- total_pop_all_grades: total graded across all grades
- scarcity_assessment: ultra_rare (pop<5), very_rare (5-20), rare (21-100), uncommon (101-500), common (500+)
- grader_breakdown: PSA count, BGS count, SGC count at this grade
- highest_grade_achieved: highest grade any copy has received (e.g. "PSA 10" if 10s exist, "PSA 9" if 9 is the highest)
- source_confidence: "high" if found live data, "medium" if estimated, "low" if not found

IMPORTANT: highest_grade_achieved must reflect what the HIGHEST graded copy is. If pop_higher > 0, then highest_grade_achieved will be a HIGHER grade than ${grade}.

Return JSON only. If you cannot find real data, set source_confidence to "low" and note it.`,
      response_json_schema: {
        type: "object",
        properties: {
          grading_company: { type: "string" },
          grade_requested: { type: "string" },
          pop_at_grade: { type: "number" },
          pop_higher: { type: ["number", "null"] },
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
      model: 'gemini_3_flash',
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});