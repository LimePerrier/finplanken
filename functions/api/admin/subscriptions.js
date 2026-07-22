// GET /api/admin/subscriptions
// Admin overview of every subscription, newest first, with the client's
// email/name and whether a cancellation has been requested.
import { json, requireAdmin } from "../../_lib/auth.js";
import { formatCad, TIERS } from "../../_lib/pricing.js";

export async function onRequestGet({ request, env }) {
  if (!requireAdmin(request, env)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await env.DB.prepare(
    `select
       s.id, s.tier, s.status, s.payment_method, s.recurring_amount_cents, s.currency,
       s.helcim_subscription_id, s.helcim_customer_code, s.activated_at, s.created_at,
       u.email, u.name,
       (select max(created_at) from payment_events pe
          where pe.subscription_id = s.id and pe.event_type = 'cancellation_requested') as cancellation_requested_at
     from subscriptions s
     left join users u on u.id = s.user_id
     order by s.created_at desc`
  ).all();

  const subscriptions = (result.results || []).map((s) => ({
    id: s.id,
    tierName: TIERS[s.tier] ? TIERS[s.tier].name : s.tier,
    status: s.status,
    email: s.email,
    name: s.name,
    amount: formatCad(s.recurring_amount_cents),
    paymentMethodLabel: s.payment_method === "ach" ? "Debit (PAD)" : "Credit card",
    helcimSubscriptionId: s.helcim_subscription_id,
    helcimCustomerCode: s.helcim_customer_code,
    activatedAt: s.activated_at || s.created_at,
    cancellationRequestedAt: s.cancellation_requested_at || null,
  }));

  return json({ subscriptions });
}
