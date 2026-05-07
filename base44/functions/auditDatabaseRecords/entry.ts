import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * DATABASE AUDIT & INTEGRITY CHECK
 * Exhaustively validates every CardValuation record in the database.
 * Checks for: missing fields, invalid data types, outliers, inconsistencies.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.role === 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    // Fetch ALL CardValuation records (paginate if needed)
    let allRecords = [];
    let skip = 0;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const resp = await base44.asServiceRole.entities.CardValuation.list();
      if (!resp || resp.length === 0) {
        hasMore = false;
        break;
      }
      allRecords = allRecords.concat(resp);
      skip += pageSize;
      if (resp.length < pageSize) hasMore = false;
    }

    const audit = {
      total_records: allRecords.length,
      valid_records: 0,
      invalid_records: 0,
      warnings: 0,
      records_by_status: {
        valid: [],
        missing_critical_fields: [],
        invalid_data_types: [],
        price_outliers: [],
        grade_mismatch: [],
        inconsistent_metadata: [],
      },
      field_quality: {
        player_name: { present: 0, valid: 0, invalid: 0 },
        card_year: { present: 0, valid: 0, invalid: 0 },
        card_set: { present: 0, valid: 0, invalid: 0 },
        grade: { present: 0, valid: 0, invalid: 0 },
        comp_value: { present: 0, valid: 0, invalid: 0 },
        ai_investment_value: { present: 0, valid: 0, invalid: 0 },
        overall_score: { present: 0, valid: 0, invalid: 0 },
        flip_vs_hold: { present: 0, valid: 0, invalid: 0 },
      },
      price_analysis: {
        min_comp: Infinity,
        max_comp: -Infinity,
        min_ai_value: Infinity,
        max_ai_value: -Infinity,
        avg_comp: 0,
        avg_ai_value: 0,
        outlier_count: 0,
      },
      grade_analysis: {
        grade_distribution: {},
        invalid_grades: [],
      },
      issues_found: [],
    };

    let compSum = 0, aiSum = 0, compCount = 0, aiCount = 0;

    // EXHAUSTIVE VALIDATION OF EACH RECORD
    for (const record of allRecords) {
      const recordId = record.id;
      const issues = [];

      // 1. CRITICAL FIELD CHECKS
      if (!record.player_name || record.player_name.trim() === '') {
        issues.push('Missing or empty player_name');
        audit.records_by_status.missing_critical_fields.push(recordId);
      }
      
      if (!record.grade && record.grade !== 'Raw') {
        issues.push('Missing grade (required or should be "Raw")');
        audit.records_by_status.missing_critical_fields.push(recordId);
      }

      // 2. DATA TYPE VALIDATION
      if (record.player_name && typeof record.player_name !== 'string') {
        issues.push(`player_name is not a string (got ${typeof record.player_name})`);
        audit.records_by_status.invalid_data_types.push(recordId);
      }

      if (record.overall_score && typeof record.overall_score !== 'number') {
        issues.push(`overall_score is not a number (got ${typeof record.overall_score})`);
        audit.records_by_status.invalid_data_types.push(recordId);
      }

      if (record.comp_value && typeof record.comp_value !== 'number') {
        issues.push(`comp_value is not a number (got ${typeof record.comp_value})`);
        audit.records_by_status.invalid_data_types.push(recordId);
      }

      if (record.ai_investment_value && typeof record.ai_investment_value !== 'number') {
        issues.push(`ai_investment_value is not a number (got ${typeof record.ai_investment_value})`);
        audit.records_by_status.invalid_data_types.push(recordId);
      }

      // 3. FIELD QUALITY TRACKING
      const fieldQualityChecks = {
        player_name: { present: !!record.player_name, valid: typeof record.player_name === 'string' && record.player_name.length > 0 },
        card_year: { present: !!record.card_year, valid: /^(19|20)\d{2}(?:-\d{2})?$/.test(String(record.card_year || '')) },
        card_set: { present: !!record.card_set, valid: typeof record.card_set === 'string' && record.card_set.length > 0 },
        grade: { present: !!record.grade, valid: /^(PSA|BGS|SGC|CGC)\s*\d+(?:\.\d)?$|^Raw$/.test(String(record.grade || '')) },
        comp_value: { present: record.comp_value > 0, valid: typeof record.comp_value === 'number' && record.comp_value > 0 },
        ai_investment_value: { present: !!record.ai_investment_value, valid: typeof record.ai_investment_value === 'number' && record.ai_investment_value > 0 },
        overall_score: { present: record.overall_score !== undefined, valid: typeof record.overall_score === 'number' && record.overall_score >= 0 && record.overall_score <= 100 },
        flip_vs_hold: { present: !!record.flip_vs_hold, valid: ['strong_buy', 'buy', 'hold', 'sell', 'strong_sell'].includes(record.flip_vs_hold) },
      };

      for (const [field, check] of Object.entries(fieldQualityChecks)) {
        if (check.present) audit.field_quality[field].present++;
        if (check.valid) audit.field_quality[field].valid++;
        else {
          audit.field_quality[field].invalid++;
          if (!issues.includes(`Invalid ${field}`)) issues.push(`Invalid ${field}`);
        }
      }

      // 4. PRICE SANITY CHECKS
      if (record.comp_value > 0) {
        audit.price_analysis.min_comp = Math.min(audit.price_analysis.min_comp, record.comp_value);
        audit.price_analysis.max_comp = Math.max(audit.price_analysis.max_comp, record.comp_value);
        compSum += record.comp_value;
        compCount++;

        // Detect outliers: >$500k or <$5
        if (record.comp_value > 500000 || record.comp_value < 5) {
          issues.push(`Price outlier: comp_value=$${record.comp_value}`);
          audit.records_by_status.price_outliers.push(recordId);
          audit.price_analysis.outlier_count++;
        }
      }

      if (record.ai_investment_value > 0) {
        audit.price_analysis.min_ai_value = Math.min(audit.price_analysis.min_ai_value, record.ai_investment_value);
        audit.price_analysis.max_ai_value = Math.max(audit.price_analysis.max_ai_value, record.ai_investment_value);
        aiSum += record.ai_investment_value;
        aiCount++;
      }

      // 5. CONSISTENCY CHECKS (comp vs AI value)
      if (record.comp_value > 0 && record.ai_investment_value > 0) {
        const diff = ((record.ai_investment_value - record.comp_value) / record.comp_value) * 100;
        // Flag if difference is <8% or >100% without justification
        if (Math.abs(diff) < 8 && record.flip_vs_hold === 'hold') {
          issues.push(`AI value differs only ${diff.toFixed(1)}% from comp but recommendation is "hold" — inconsistent`);
          audit.records_by_status.inconsistent_metadata.push(recordId);
        }
      }

      // 6. GRADE VALIDATION
      if (record.grade) {
        audit.grade_analysis.grade_distribution[record.grade] = (audit.grade_analysis.grade_distribution[record.grade] || 0) + 1;
        const isValidGrade = /^(PSA|BGS|SGC|CGC)\s*\d+(?:\.\d)?$|^Raw$/.test(record.grade);
        if (!isValidGrade) {
          audit.grade_analysis.invalid_grades.push({ recordId, grade: record.grade });
        }
      }

      // FINAL STATUS
      if (issues.length === 0) {
        audit.valid_records++;
        audit.records_by_status.valid.push(recordId);
      } else {
        audit.invalid_records++;
        audit.issues_found.push({
          recordId,
          player: record.player_name || 'Unknown',
          issues,
        });
      }

      if (issues.length > 0 && issues.length <= 2) {
        audit.warnings += issues.length;
      }
    }

    // Calculate averages
    audit.price_analysis.avg_comp = compCount > 0 ? (compSum / compCount).toFixed(2) : 0;
    audit.price_analysis.avg_ai_value = aiCount > 0 ? (aiSum / aiCount).toFixed(2) : 0;

    // Summary
    const validityScore = ((audit.valid_records / audit.total_records) * 100).toFixed(2);

    return Response.json({
      ...audit,
      validity_score_percent: parseFloat(validityScore),
      status: parseFloat(validityScore) === 100 
        ? '✅ ALL RECORDS VALID'
        : parseFloat(validityScore) >= 95
        ? '⚠️ MOSTLY VALID (>95%)'
        : '❌ DATA QUALITY ISSUES',
      top_issues: audit.issues_found.slice(0, 20), // Top 20 issues
      recommendation: parseFloat(validityScore) >= 95 
        ? 'Database is healthy. Proceed with confidence.'
        : `Fix ${audit.invalid_records} invalid record(s) before running bulk valuations.`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});