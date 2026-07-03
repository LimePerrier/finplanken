import { getUserFromSession, json } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(request, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const result = await env.DB.prepare(
    "select id, title, document_type, file_name, content_type, size_bytes, uploaded_at from client_documents where user_id = ? and document_type != 'spreadsheet' order by uploaded_at desc"
  ).bind(user.id).all();

  return json({ documents: result.results || [] });
}
