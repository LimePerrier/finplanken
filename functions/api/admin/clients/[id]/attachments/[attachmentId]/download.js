import { json, requireAdmin } from "../../../../../../_lib/auth.js";

export async function onRequestGet({ request, env, params }) {
  if (!requireAdmin(request, env)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!env.CLIENT_FILES) return json({ error: "CLIENT_FILES R2 binding is not configured." }, { status: 500 });

  const attachment = await env.DB.prepare(
    "select file_name, content_type, r2_key from questionnaire_attachments where id = ? and user_id = ?"
  ).bind(params.attachmentId, params.id).first();
  if (!attachment) return json({ error: "File not found." }, { status: 404 });

  const object = await env.CLIENT_FILES.get(attachment.r2_key);
  if (!object) return json({ error: "File not found." }, { status: 404 });

  const fileName = attachment.file_name.replace(/"/g, "");
  return new Response(object.body, {
    headers: {
      "content-type": attachment.content_type,
      "content-disposition": `inline; filename="${fileName}"`,
      "cache-control": "private, no-store",
    },
  });
}
