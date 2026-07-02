import { getUserFromSession, json, randomId, readJson } from "../../_lib/auth.js";

export const questions = [
  { id: "goals", label: "What are your top financial goals right now?", type: "textarea", required: true },
  { id: "concerns", label: "What financial decisions feel most urgent or uncertain?", type: "textarea", required: true },
  { id: "income", label: "Approximate annual household income", type: "text", required: false },
  { id: "assets", label: "List major accounts, corporations, properties, or other assets we should know about.", type: "textarea", required: false },
  { id: "documents", label: "Are there documents you plan to share with us soon?", type: "textarea", required: false },
];

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(request, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  let response = await env.DB.prepare(
    "select id, status, answers_json, submitted_at, updated_at from questionnaire_responses where user_id = ? order by created_at desc limit 1"
  ).bind(user.id).first();

  if (!response) {
    response = { id: null, status: "draft", answers_json: "{}", submitted_at: null, updated_at: null };
  }

  return json({ questions, response: { ...response, answers: JSON.parse(response.answers_json || "{}") } });
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(request, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const submit = Boolean(body.submit);

  for (const question of questions) {
    if (question.required && submit && !String(answers[question.id] || "").trim()) {
      return json({ error: `Answer required: ${question.label}` }, { status: 400 });
    }
  }

  const existing = await env.DB.prepare(
    "select id from questionnaire_responses where user_id = ? order by created_at desc limit 1"
  ).bind(user.id).first();
  const now = new Date().toISOString();
  const status = submit ? "submitted" : "draft";
  const submittedAt = submit ? now : null;
  const answersJson = JSON.stringify(answers);

  if (existing) {
    await env.DB.prepare(
      "update questionnaire_responses set answers_json = ?, status = ?, submitted_at = coalesce(?, submitted_at), updated_at = ? where id = ?"
    ).bind(answersJson, status, submittedAt, now, existing.id).run();
  } else {
    await env.DB.prepare(
      "insert into questionnaire_responses (id, user_id, status, answers_json, submitted_at, updated_at) values (?, ?, ?, ?, ?, ?)"
    ).bind(randomId("qr_"), user.id, status, answersJson, submittedAt, now).run();
  }

  return json({ ok: true, status });
}
