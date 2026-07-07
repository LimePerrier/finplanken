import { getUserFromSession, json, randomId } from "../../../_lib/auth.js";

export const MAX_ATTACHMENTS = 50;

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(request, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const result = await env.DB.prepare(
    "select id, file_name, content_type, size_bytes, uploaded_at from questionnaire_attachments where user_id = ? order by uploaded_at desc"
  ).bind(user.id).all();

  return json({ attachments: result.results || [] });
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(request, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  if (!env.CLIENT_FILES) return json({ error: "CLIENT_FILES R2 binding is not configured." }, { status: 500 });

  const count = await env.DB.prepare(
    "select count(*) as count from questionnaire_attachments where user_id = ?"
  ).bind(user.id).first();
  if ((count?.count || 0) >= MAX_ATTACHMENTS) {
    return json({ error: `You can upload a maximum of ${MAX_ATTACHMENTS} files.` }, { status: 400 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return json({ error: "Choose a file to upload." }, { status: 400 });
  if (!allowedTypes.includes(file.type)) {
    return json({ error: "That file type is not supported. Upload images, PDF, or Word documents." }, { status: 400 });
  }

  const id = randomId("qa_");
  const safeName = file.name.replace(/[^\w.\- ]+/g, "").slice(0, 120) || "attachment";
  const r2Key = `clients/${user.id}/questionnaire-attachments/${id}/${safeName}`;
  await env.CLIENT_FILES.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { userId: user.id, attachmentId: id },
  });

  const uploadedAt = new Date().toISOString();
  await env.DB.prepare(
    `insert into questionnaire_attachments (id, user_id, file_name, content_type, r2_key, size_bytes, uploaded_at)
     values (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, user.id, safeName, file.type, r2Key, file.size || null, uploadedAt).run();

  return json({ ok: true, id, file_name: safeName, content_type: file.type, size_bytes: file.size || null, uploaded_at: uploadedAt });
}
