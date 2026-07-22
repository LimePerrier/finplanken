// Client-facing subscription endpoint.
//   GET  -> the logged-in client's current subscription (read-only)
//   POST -> record a cancellation request and email the firm
// Cancellation is request-only: the client never cancels directly in
// Helcim. The firm reviews (including the first-year commitment) and
// cancels in the Helcim dashboard.
import { getUserFromSession, json, readJson, randomId } from "../../_lib/auth.js";
import { formatCad, TIERS } from "../../_lib/pricing.js";
import { sendEmail } from "../../_lib/email.js";

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(request, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const sub = await env.DB.prepare(
    `select * from subscriptions where user_id = ? order by created_at desc limit 1`
  ).bind(user.id).first();

  if (!sub) return json({ subscription: null });

  // Has a cancellation already been requested (and not yet actioned)?
  const pending = await env.DB.prepare(
    `select created_at from payment_events
     where subscription_id = ? and event_type = 'cancellation_requested'
     order by created_at desc limit 1`
  ).bind(sub.id).first();

  return json({ subscription: presentSubscription(sub, !!pending) });
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(request, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  const action = String(body.action || "").trim();
  if (action !== "request_cancellation") {
    return json({ error: "Unsupported action." }, { status: 400 });
  }

  const sub = await env.DB.prepare(
    `select * from subscriptions where user_id = ? order by created_at desc limit 1`
  ).bind(user.id).first();
  if (!sub) return json({ error: "You don't have an active subscription." }, { status: 404 });
  if (sub.status === "cancelled") {
    return json({ error: "This subscription is already cancelled." }, { status: 409 });
  }

  const reason = String(body.reason || "").trim().slice(0, 1000);
  const view = presentSubscription(sub, true);

  // Audit the request so the portal can show "pending" and the firm has a record.
  await env.DB.prepare(
    `insert into payment_events (id, intent_id, subscription_id, event_type, raw_json)
     values (?, ?, ?, 'cancellation_requested', ?)`
  ).bind(
    randomId("evt_"), sub.intent_id, sub.id,
    JSON.stringify({ userId: user.id, email: user.email, name: user.name, reason, at: new Date().toISOString() })
  ).run();

  // Notify the firm. Never fail the request just because email is unconfigured;
  // the record above is the source of truth and the admin list surfaces it.
  const to = env.CANCELLATION_TO || env.ADMIN_NOTIFY_EMAIL || "info@bracketplanning.ca";
  let emailed = false;
  try {
    const result = await sendEmail(env, {
      to,
      subject: `Cancellation requested — ${view.tierName} (${user.email})`,
      text:
        `A client has requested to cancel their subscription.\n\n` +
        `Client: ${user.name || "(no name)"} <${user.email}>\n` +
        `Plan: ${view.tierName} (${view.paymentMethodLabel})\n` +
        `Amount: ${view.amount} every 6 months\n` +
        `Helcim subscription ID: ${sub.helcim_subscription_id || "(none)"}\n` +
        `Helcim customer code: ${sub.helcim_customer_code || "(none)"}\n` +
        `Activated: ${sub.activated_at || sub.created_at}\n` +
        `First-year commitment met: ${view.commitmentMet ? "yes" : "no"}\n` +
        `Reason given: ${reason || "(none)"}\n\n` +
        `Action: cancel this subscription in the Helcim dashboard if appropriate.`,
      html:
        `<p>A client has requested to cancel their subscription.</p>` +
        `<ul>` +
        `<li><b>Client:</b> ${escapeHtml(user.name || "(no name)")} &lt;${escapeHtml(user.email)}&gt;</li>` +
        `<li><b>Plan:</b> ${escapeHtml(view.tierName)} (${escapeHtml(view.paymentMethodLabel)})</li>` +
        `<li><b>Amount:</b> ${escapeHtml(view.amount)} every 6 months</li>` +
        `<li><b>Helcim subscription ID:</b> ${escapeHtml(sub.helcim_subscription_id || "(none)")}</li>` +
        `<li><b>Helcim customer code:</b> ${escapeHtml(sub.helcim_customer_code || "(none)")}</li>` +
        `<li><b>Activated:</b> ${escapeHtml(sub.activated_at || sub.created_at)}</li>` +
        `<li><b>First-year commitment met:</b> ${view.commitmentMet ? "yes" : "no"}</li>` +
        `<li><b>Reason given:</b> ${escapeHtml(reason || "(none)")}</li>` +
        `</ul>` +
        `<p>Cancel this subscription in the Helcim dashboard if appropriate.</p>`,
    });
    emailed = !!result.sent;
  } catch {
    emailed = false;
  }

  return json({ ok: true, emailed, subscription: presentSubscription(sub, true) });
}

// Shape a DB row into what the portal shows, deriving next billing date
// and whether the first-year (two-payment) commitment is satisfied.
function presentSubscription(sub, cancellationRequested) {
  const tierName = TIERS[sub.tier] ? TIERS[sub.tier].name : sub.tier;
  const start = new Date(sub.activated_at || sub.created_at);
  const increments = sub.billing_period_increments || 6;

  let nextBilling = null;
  let commitmentMet = true;
  if (sub.status === "active" && !isNaN(start.getTime())) {
    nextBilling = nextBillingDate(start, increments);
    // Two required semi-annual payments == 12 months of commitment.
    const commitmentEnd = addMonths(start, increments * 2);
    commitmentMet = Date.now() >= commitmentEnd.getTime();
  }

  return {
    tier: sub.tier,
    tierName,
    status: sub.status,
    // Stored amount is the pre-tax base; Helcim adds GST/HST on the receipt.
    amount: formatCad(sub.recurring_amount_cents) + " + GST/HST",
    currency: sub.currency,
    paymentMethod: sub.payment_method,
    paymentMethodLabel: sub.payment_method === "ach" ? "Pre-authorized debit" : "Credit card",
    cadenceLabel: "Every 6 months",
    activatedAt: sub.activated_at || sub.created_at,
    nextBillingDate: nextBilling ? nextBilling.toISOString().slice(0, 10) : null,
    commitmentMet,
    cancellationRequested: !!cancellationRequested,
  };
}

function addMonths(date, months) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function nextBillingDate(start, increments) {
  const now = Date.now();
  let k = 1;
  let next = addMonths(start, increments * k);
  // Advance in 6-month steps until we're past today (cap to avoid runaway).
  while (next.getTime() <= now && k < 400) {
    k += 1;
    next = addMonths(start, increments * k);
  }
  return next;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
