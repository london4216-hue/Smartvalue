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

    // If we have a cert number, try direct PSA cert lookup — returns pop_at_grade + pop_higher directly
    if (cert_number && gradeCompany === 'PSA') {
      try {
        const certClean = cert_number.toString().replace(/\D/g, '');
        // PSA public cert lookup — returns PopulationAtGrade and PopulationHigher
        const psaRes = await fetch(`https://www.psacard.com/cert/${certClean}`, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }
        });
        if (psaRes.ok) {
          const html = await psaRes.text();
          // Extract pop data from PSA cert page HTML
          const popAtMatch = html.match(/Population[^<]*<[^>]+>(\d+)/i) || html.match(/"population"\s*:\s*(\d+)/i);
          const popHigherMatch = html.match(/Pop\s+Higher[^<]*<[^>]+>(\d+)/i) || html.match(/"popHigher"\s*:\s*(\d+)/i);
          
          if (popAtMatch || popHigherMatch) {
            const popAtGrade = popAtMatch ? parseInt(popAtMatch[1]) : null;
            const popHigher = popHigherMatch ? parseInt(popHigherMatch[1]) : null;
            const isHighestGraded = popHigher === 0;
            const totalPop = popAtGrade !== null ? popAtGrade + (popHigher || 0) : null;
            
            if (popAtGrade !== null) {
              const scarcity = popAtGrade <= 4 ? 'ultra_rare' : popAtGrade <= 20 ? 'very_rare' : popAtGrade <= 100 ? 'rare' : popAtGrade <= 500 ? 'uncommon' : 'common';
              return Response.json({
                grade_requested: grade,
                grading_company: 'PSA',
                pop_at_grade: popAtGrade,
                pop_higher: popHigher,
                total_pop_all_grades: totalPop,
                highest_grade_achieved: isHighestGraded ? grade : null,
                scarcity_assessment: scarcity,
                source_confidence: 'high',
                notes: `Direct PSA cert lookup for #${certClean}`
              });
            }
          }
        }
      } catch (_) {}

      // Fallback: use LLM with the cert number specifically to look up PSA cert page
      try {
        const certClean = cert_number.toString().replace(/\D/g, '');
        const certResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Look up PSA cert number ${certClean} at https://www.psacard.com/cert/${certClean}
          
Return the EXACT data shown on that page:
- pop_at_grade: the "Population" number shown
- pop_higher: the "Pop Higher" number shown (0 if it shows 0, NOT null)
- Grade shown on cert
- Card title/description

If the page shows Population=1 and Pop Higher=0, that means this is the single highest graded copy.

Return JSON: pop_at_grade, pop_higher, grade_on_cert, card_description, source_confidence ("high" if found page)`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              pop_at_grade: { type: ["number", "null"] },
              pop_higher: { type: ["number", "null"] },
              grade_on_cert: { type: ["string", "null"] },
              card_description: { type: ["string", "null"] },
              source_confidence: { type: "string" }
            }
          },
          model: 'gemini_3_flash',
        });

        if (certResult?.pop_at_grade !== null && certResult?.pop_at_grade !== undefined) {
          const p = certResult.pop_at_grade;
          const ph = certResult.pop_higher;
          const scarcity = p <= 4 ? 'ultra_rare' : p <= 20 ? 'very_rare' : p <= 100 ? 'rare' : p <= 500 ? 'uncommon' : 'common';
          return Response.json({
            grade_requested: grade,
            grading_company: 'PSA',
            pop_at_grade: p,
            pop_higher: ph,
            total_pop_all_grades: p + (ph || 0),
            highest_grade_achieved: ph === 0 ? grade : null,
            scarcity_assessment: scarcity,
            source_confidence: certResult.source_confidence || 'medium',
            notes: `PSA cert #${certClean} lookup`
          });
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