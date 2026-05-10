import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apify_token = Deno.env.get('APIFY_TOKEN') || '';
    if (!apify_token) {
      return Response.json({ success: false, error: 'APIFY_TOKEN secret not set.' });
    }

    // Validate token
    const userRes = await fetch('https://api.apify.com/v2/users/me?token=' + apify_token, {
      signal: AbortSignal.timeout(8000),
    });

    if (!userRes.ok) {
      const text = await userRes.text();
      return Response.json({
        success: false,
        error: `Invalid Apify token (status ${userRes.status}).`,
        detail: text,
      });
    }

    const userData = await userRes.json();
    const username = userData?.data?.username || 'unknown';

    // Test a real scrape with the junglee actor and capture raw response shape
    const scrapeRes = await fetch(
      `https://api.apify.com/v2/acts/junglee~ebay-search-scraper/run-sync-get-dataset-items?token=${apify_token}&timeout=60&memory=512`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQueries: ['LeBron James 2003 Topps Chrome PSA 9'],
          maxItems: 5,
          soldListings: true,
        }),
        signal: AbortSignal.timeout(65000),
      }
    );

    let sampleData = null;
    let actorWorked = false;
    if (scrapeRes.ok) {
      const results = await scrapeRes.json();
      if (Array.isArray(results) && results.length > 0) {
        actorWorked = true;
        // Return first item so we can inspect the field names
        sampleData = results[0];
      }
    }

    return Response.json({
      success: true,
      username,
      actor_worked: actorWorked,
      sample_item: sampleData,
      message: actorWorked
        ? `✓ Token valid (${username}). Actor returned data — check sample_item for field names.`
        : `✓ Token valid (${username}). Actor ran but returned no results for test query.`,
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});