import { getUserFromSession, json } from "../../../../_lib/auth.js";

export async function onRequestGet({ request, env, params }) {
  const user = await getUserFromSession(request, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  if (!env.CLIENT_FILES) return json({ error: "CLIENT_FILES R2 binding is not configured." }, { status: 500 });

  const doc = await env.DB.prepare(
    "select id, file_name, content_type, r2_key, document_type from client_documents where id = ? and user_id = ?"
  ).bind(params.id, user.id).first();
  if (!doc) return json({ error: "Document not found." }, { status: 404 });
  if (doc.document_type === "spreadsheet") return json({ error: "Document not found." }, { status: 404 });

  const object = await env.CLIENT_FILES.get(doc.r2_key);
  if (!object) return json({ error: "File not found." }, { status: 404 });

  return new Response(object.body, {
    headers: {
      "content-type": doc.content_type,
      "content-disposition": `attachment; filename="${doc.file_name.replace(/"/g, "")}"`,
      "cache-control": "private, no-store",
    },
  });
}
