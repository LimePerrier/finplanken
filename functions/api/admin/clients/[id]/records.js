import { json, randomId, readJson, requireAdmin } from "../../../../_lib/auth.js";

export async function onRequestPost({ request, env, params }) {
  if (!requireAdmin(request, env)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await env.DB.prepare(
    "select id from users where id = ? and role = 'client'"
  ).bind(params.id).first();
  if (!user) return json({ error: "Client not found." }, { status: 404 });

  const body = await readJson(request);
  const title = String(body.title || "").trim();
  const recordBody = String(body.body || "").trim();
  const recordType = String(body.recordType || "note").trim() || "note";
  const visibleToClient = body.visibleToClient ? 1 : 0;

  if (!title || !recordBody) {
    return json({ error: "Add both a title and details." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = randomId("rec_");
  await env.DB.prepare(
    `insert into client_records
      (id, user_id, title, body, record_type, visible_to_client, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, params.id, title, recordBody, recordType, visibleToClient, now, now).run();

  return json({ ok: true, id });
}
