import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Test cases: real cards with known comps
    const testCases = [
      { player: 'LeBron James', year: '2003', set: 'Topps', grade: 'PSA 10', auto: true },
      { player: 'Michael Jordan', year: '1986', set: 'Fleer', grade: 'PSA 9', auto: false },
      { player: 'Kobe Bryant', year: '1996', set: 'Topps Finest', grade: 'PSA 8', auto: true },
      { player: 'Luka Doncic', year: '2018', set: 'Donruss', grade: 'PSA 10', auto: true },
      { player: 'Ja Morant', year: '2019', set: 'Panini Prizm', grade: 'PSA 9', auto: false },
      { player: 'Kevin Durant', year: '2007', set: 'Topps', grade: 'PSA 10', auto: false },
      { player: 'Giannis Antetokounmpo', year: '2013', set: 'Panini Prizm', grade: 'PSA 9', auto: true },
      { player: 'Stephen Curry', year: '2009', set: 'Topps Finest', grade: 'PSA 8', auto: true },
      { player: 'Tim Duncan', year: '1997', set: 'Topps', grade: 'PSA 9', auto: false },
      { player: 'Magic Johnson', year: '1979', set: 'Topps', grade: 'PSA 7', auto: false },
    ];

    const results = [];

    for (const tc of testCases) {
      try {
        const response = await base44.asServiceRole.functions.invoke('fetchLiveSoldComps', {
          player_name: tc.player,
          card_year: tc.year,
          card_set: tc.set,
          grade: tc.grade,
          has_autograph: tc.auto,
        });

        const data = response.data || {};
        results.push({
          card: `${tc.player} ${tc.year} ${tc.set} ${tc.grade}`,
          comp_price: data.comp_value || null,
          sale_date: data.sale_date || null,
          source: data.source || 'unknown',
          confidence: data.confidence || 'unknown',
          tier: data.tier || 'unknown',
          notes: data.notes || '',
          passed: data.comp_value && data.comp_value > 0 && data.sale_date ? '✓' : '⚠',
        });
      } catch (err) {
        results.push({
          card: `${tc.player} ${tc.year} ${tc.set} ${tc.grade}`,
          error: err.message,
          passed: '✗',
        });
      }
    }

    // Summary stats
    const passed = results.filter(r => r.passed === '✓').length;
    const warned = results.filter(r => r.passed === '⚠').length;
    const failed = results.filter(r => r.passed === '✗').length;
    const passRate = ((passed / results.length) * 100).toFixed(1);

    return Response.json({
      test_run: `${testCases.length} cards tested`,
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: results.length,
        passed,
        warned,
        failed,
        pass_rate: `${passRate}%`,
      },
      status: passRate >= 80 ? '✓ ACCURACY OK' : passRate >= 60 ? '⚠ NEEDS IMPROVEMENT' : '✗ CRITICAL ISSUES',
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});