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
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const status = body.status === "submitted" ? "submitted" : "draft";
  const now = new Date().toISOString();
  const submittedAt = status === "submitted" ? now : null;
  const answersJson = JSON.stringify(answers);

  const existing = await env.DB.prepare(
    "select id from questionnaire_responses where user_id = ? order by created_at desc limit 1"
  ).bind(params.id).first();

  if (existing) {
    await env.DB.prepare(
      "update questionnaire_responses set answers_json = ?, status = ?, submitted_at = coalesce(?, submitted_at), updated_at = ? where id = ?"
    ).bind(answersJson, status, submittedAt, now, existing.id).run();
  } else {
    await env.DB.prepare(
      "insert into questionnaire_responses (id, user_id, status, answers_json, submitted_at, updated_at) values (?, ?, ?, ?, ?, ?)"
    ).bind(randomId("qr_"), params.id, status, answersJson, submittedAt, now).run();
  }

  return json({ ok: true, status });
}
