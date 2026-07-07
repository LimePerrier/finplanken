import { getUserFromSession, json } from "../../../../_lib/auth.js";

export async function onRequestDelete({ request, env, params }) {
  const user = await getUserFromSession(request, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  if (!env.CLIENT_FILES) return json({ error: "CLIENT_FILES R2 binding is not configured." }, { status: 500 });

  const attachment = await env.DB.prepare(
    "select id, r2_key from questionnaire_attachments where id = ? and user_id = ?"
  ).bind(params.id, user.id).first();
  if (!attachment) return json({ error: "File not found." }, { status: 404 });

  await env.CLIENT_FILES.delete(attachment.r2_key);
  await env.DB.prepare("delete from questionnaire_attachments where id = ? and user_id = ?").bind(params.id, user.id).run();

  return json({ ok: true });
}
