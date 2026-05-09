import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { apify_token } = await req.json();
    if (!apify_token) {
      return Response.json({ error: 'apify_token is required' }, { status: 400 });
    }

    // Test with a simple eBay search
    const testQuery = 'LeBron James 2003 Rookie';
    
    const apifyRes = await fetch(
      'https://api.apify.com/v2/actor-tasks/heropuppeteer~ebay-sold-listings-scraper/run-sync?token=' + apify_token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: testQuery,
          maxResults: 10,
          includeActiveListings: false,
          includeSoldListings: true,
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!apifyRes.ok) {
      return Response.json({
        success: false,
        error: `Apify API returned ${apifyRes.status}`,
        status_code: apifyRes.status,
        response_text: await apifyRes.text(),
      }, { status: 400 });
    }

    const apifyData = await apifyRes.json();
    const results = apifyData.output?.results || [];

    if (results.length === 0) {
      return Response.json({
        success: false,
        error: 'No eBay data returned from Apify',
        query: testQuery,
        output: apifyData.output,
      });
    }

    // Extract sample data from first result
    const sample = results[0];
    return Response.json({
      success: true,
      message: `✓ Apify is working! Found ${results.length} results for "${testQuery}"`,
      sample_result: {
        title: sample.title,
        sold_price: sample.soldPrice,
        sold_date: sample.soldDate,
        item_url: sample.url,
      },
      total_results: results.length,
      all_results: results.slice(0, 5).map(r => ({
        title: r.title,
        price: r.soldPrice,
        date: r.soldDate,
      })),
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
      type: error.name,
    }, { status: 500 });
  }
});