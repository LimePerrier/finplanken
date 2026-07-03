import { json, requireAdmin } from "../../../../../_lib/auth.js";

export async function onRequestDelete({ request, env, params }) {
  if (!requireAdmin(request, env)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!env.CLIENT_FILES) {
    return json({ error: "CLIENT_FILES R2 binding is not configured." }, { status: 500 });
  }

  const doc = await env.DB.prepare(
    `select id, user_id, document_type, r2_key
     from client_documents
     where id = ? and user_id = ?`
  ).bind(params.documentId, params.id).first();
  if (!doc) return json({ error: "Document not found." }, { status: 404 });

  await env.CLIENT_FILES.delete(doc.r2_key);
  await env.DB.prepare("delete from client_documents where id = ? and user_id = ?").bind(doc.id, params.id).run();

  if (doc.document_type === "spreadsheet") {
    await env.DB.prepare(
      "delete from client_dashboard_data where user_id = ? and source_document_id = ?"
    ).bind(params.id, doc.id).run();
  }

  return json({ ok: true });
}
