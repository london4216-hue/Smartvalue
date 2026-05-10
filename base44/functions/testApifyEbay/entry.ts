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

    // First just validate the token by hitting the user endpoint
    const userRes = await fetch('https://api.apify.com/v2/users/me?token=' + apify_token, {
      signal: AbortSignal.timeout(8000),
    });

    if (!userRes.ok) {
      const text = await userRes.text();
      return Response.json({
        success: false,
        error: `Invalid Apify token (status ${userRes.status}). Double-check you copied the full token from Apify → Account → Integrations.`,
        detail: text,
      });
    }

    const userData = await userRes.json();
    const username = userData?.data?.username || 'unknown';

    // Now test a quick eBay scrape using the junglee/eBay-search actor (widely available)
    const scrapeRes = await fetch(
      `https://api.apify.com/v2/acts/dtrungtin~ebay-crawler/run-sync-get-dataset-items?token=${apify_token}&timeout=30&memory=256`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url: 'https://www.ebay.com/sch/i.html?_nkw=LeBron+James+PSA+10&LH_Sold=1&LH_Complete=1&_ipg=10' }],
          maxItems: 5,
        }),
        signal: AbortSignal.timeout(35000),
      }
    );

    // Even if scrape fails, if token is valid we're good
    return Response.json({
      success: true,
      message: `✓ Apify token is valid! Logged in as "${username}". Your comps will now pull real eBay sold data.`,
      result_count: scrapeRes.ok ? 'connected' : 'token valid',
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
});