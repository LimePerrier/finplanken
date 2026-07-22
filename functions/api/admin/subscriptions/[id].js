// PATCH /api/admin/subscriptions/:id
// Mark a subscription cancelled in OUR records after you've cancelled it
// in the Helcim dashboard (Helcim stays the source of truth for billing).
// This is the manual "close the loop" action — there is no Helcim webhook
// for subscription status, so the admin confirms it here.
import { json, readJson, requireAdmin, randomId } from "../../../_lib/auth.js";

export async function onRequestPatch({ request, env, params }) {
  if (!requireAdmin(request, env)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = String(params.id || "");
  const body = await readJson(request);
  const status = String(body.status || "").trim();
  if (status !== "cancelled") {
    return json({ error: "Only 'cancelled' is supported here. Cancel billing in Helcim first." }, { status: 400 });
  }

  const sub = await env.DB.prepare("select id, status from subscriptions where id = ?").bind(id).first();
  if (!sub) return json({ error: "Subscription not found." }, { status: 404 });

  await env.DB.prepare(
    "update subscriptions set status = 'cancelled', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') where id = ?"
  ).bind(id).run();

  await env.DB.prepare(
    `insert into payment_events (id, intent_id, subscription_id, event_type, raw_json)
     values (?, (select intent_id from subscriptions where id = ?), ?, 'cancelled_by_admin', ?)`
  ).bind(randomId("evt_"), id, id, JSON.stringify({ at: new Date().toISOString() })).run();

  return json({ ok: true, id, status: "cancelled" });
}
