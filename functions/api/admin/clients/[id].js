import { json, readJson, requireAdmin } from "../../../_lib/auth.js";
import { questions } from "../../client/questionnaire.js";

export async function onRequestGet({ request, env, params }) {
  if (!requireAdmin(request, env)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await env.DB.prepare(
    "select id, email, name, role, status, created_at, updated_at from users where id = ? and role = 'client'"
  ).bind(params.id).first();
  if (!user) return json({ error: "Client not found." }, { status: 404 });

  const records = await env.DB.prepare(
    "select id, title, body, record_type, visible_to_client, created_at, updated_at from client_records where user_id = ? order by created_at desc"
  ).bind(params.id).all();

  const invites = await env.DB.prepare(
    "select id, email, expires_at, used_at, created_at from invites where user_id = ? order by created_at desc limit 10"
  ).bind(params.id).all();

  const documents = await env.DB.prepare(
    "select id, title, document_type, file_name, content_type, size_bytes, uploaded_at from client_documents where user_id = ? order by uploaded_at desc"
  ).bind(params.id).all();

  const questionnaire = await env.DB.prepare(
    "select id, status, answers_json, submitted_at, updated_at from questionnaire_responses where user_id = ? order by created_at desc limit 1"
  ).bind(params.id).first();

  const attachments = await env.DB.prepare(
    "select id, file_name, content_type, size_bytes, uploaded_at from questionnaire_attachments where user_id = ? order by uploaded_at desc"
  ).bind(params.id).all();

  return json({
    client: user,
    records: records.results || [],
    invites: invites.results || [],
    documents: documents.results || [],
    attachments: attachments.results || [],
    questionnaire: questionnaire
      ? { ...questionnaire, questions, answers: JSON.parse(questionnaire.answers_json || "{}") }
      : { id: null, status: "draft", answers: {}, submitted_at: null, updated_at: null, questions },
  });
}

export async function onRequestPatch({ request, env, params }) {
  if (!requireAdmin(request, env)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJson(request);
  const user = await env.DB.prepare(
    "select id, status, password_hash from users where id = ? and role = 'client'"
  ).bind(params.id).first();
  if (!user) return json({ error: "Client not found." }, { status: 404 });

  const updates = [];
  const values = [];

  if (typeof body.name === "string") {
    updates.push("name = ?");
    values.push(body.name.trim() || null);
  }

  if (typeof body.status === "string") {
    const nextStatus = body.status;
    if (!["invited", "active", "disabled"].includes(nextStatus)) {
      return json({ error: "Invalid client status." }, { status: 400 });
    }
    if (nextStatus === "active" && !user.password_hash) {
      return json({ error: "Client cannot be activated until they set a password." }, { status: 400 });
    }
    updates.push("status = ?");
    values.push(nextStatus);
  }

  if (!updates.length) return json({ error: "No client changes provided." }, { status: 400 });

  updates.push("updated_at = ?");
  values.push(new Date().toISOString(), params.id);

  await env.DB.prepare(`update users set ${updates.join(", ")} where id = ?`).bind(...values).run();

  if (body.status === "disabled") {
    await env.DB.prepare("delete from sessions where user_id = ?").bind(params.id).run();
  }

  return json({ ok: true });
}
