import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { player_name, card_set, grade, variation, last_sold_price } = body;

    if (!player_name || !last_sold_price) {
      return Response.json({ matches: [] });
    }

    // Fetch all active alerts for this user
    const alerts = await base44.entities.CardAlert.filter({ is_active: true });

    const matches = [];

    for (const alert of alerts) {
      // Name match (case-insensitive substring)
      const nameMatch = alert.player_name &&
        player_name.toLowerCase().includes(alert.player_name.toLowerCase());
      if (!nameMatch) continue;

      // Grade match if specified
      if (alert.grade && grade &&
        alert.grade.toLowerCase() !== grade.toLowerCase()) continue;

      // Set match if specified (substring)
      if (alert.card_set && card_set &&
        !card_set.toLowerCase().includes(alert.card_set.toLowerCase())) continue;

      // Variation match if specified
      if (alert.variation && variation &&
        !variation.toLowerCase().includes(alert.variation.toLowerCase())) continue;

      // Price logic
      const price = parseFloat(last_sold_price);
      let priceMatch = false;

      if (alert.alert_type === 'any_sale') {
        priceMatch = true;
      } else if (alert.alert_type === 'below_price' && alert.price_max) {
        priceMatch = price <= alert.price_max;
      } else if (alert.alert_type === 'above_price' && alert.price_min) {
        priceMatch = price >= alert.price_min;
      } else if (alert.alert_type === 'in_range' && alert.price_min && alert.price_max) {
        priceMatch = price >= alert.price_min && price <= alert.price_max;
      }

      if (!priceMatch) continue;

      // Update alert trigger stats
      await base44.entities.CardAlert.update(alert.id, {
        last_triggered_at: new Date().toISOString(),
        last_triggered_value: price,
        trigger_count: (alert.trigger_count || 0) + 1,
      });

      matches.push({
        alert_id: alert.id,
        player_name: alert.player_name,
        grade: alert.grade || null,
        card_set: alert.card_set || null,
        alert_type: alert.alert_type,
        price_min: alert.price_min || null,
        price_max: alert.price_max || null,
        triggered_value: price,
        notes: alert.notes || null,
      });
    }

    return Response.json({ matches });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});