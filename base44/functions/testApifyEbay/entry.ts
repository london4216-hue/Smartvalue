import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apify_token = Deno.env.get('APIFY_TOKEN') || '';
    if (!apify_token) return Response.json({ success: false, error: 'APIFY_TOKEN not set.' });

    // Validate token
    const userRes = await fetch('https://api.apify.com/v2/users/me?token=' + apify_token, { signal: AbortSignal.timeout(8000) });
    if (!userRes.ok) return Response.json({ success: false, error: `Invalid token (${userRes.status})` });
    const userData = await userRes.json();
    const username = userData?.data?.username || 'unknown';

    // Test the correct actor: caffein.dev/ebay-sold-listings
    const r = await fetch(
      `https://api.apify.com/v2/acts/caffein.dev~ebay-sold-listings/run-sync-get-dataset-items?token=${apify_token}&timeout=60&memory=512`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: ['LeBron James 2003 Topps Chrome PSA 9'],
          count: 5,
          daysToScrape: 90,
          sortOrder: 'endedRecently',
        }),
        signal: AbortSignal.timeout(65000),
      }
    );

    let result;
    if (r.ok) {
      const data = await r.json();
      result = {
        status: r.status,
        count: Array.isArray(data) ? data.length : 0,
        sample: Array.isArray(data) ? data[0] : data,
        actor_worked: Array.isArray(data) && data.length > 0,
      };
    } else {
      const txt = await r.text();
      result = { status: r.status, error: txt.slice(0, 500) };
    }

    return Response.json({
      success: true,
      username,
      message: result.actor_worked
        ? `✓ Token valid (${username}). Actor returned ${result.count} results!`
        : `✓ Token valid (${username}). Actor ran but returned no results for test query.`,
      result,
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});