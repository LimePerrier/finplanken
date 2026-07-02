import { json, randomId, requireAdmin } from "../../../../_lib/auth.js";

const allowedTypes = {
  plan_pdf: ["application/pdf"],
  spreadsheet: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
  ],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ],
};

export async function onRequestPost({ request, env, params }) {
  if (!requireAdmin(request, env)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!env.CLIENT_FILES) {
    return json({ error: "CLIENT_FILES R2 binding is not configured." }, { status: 500 });
  }

  const user = await env.DB.prepare("select id from users where id = ? and role = 'client'").bind(params.id).first();
  if (!user) return json({ error: "Client not found." }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  const documentType = String(form.get("documentType") || "");
  const title = String(form.get("title") || "").trim();

  if (!file || typeof file === "string") return json({ error: "Choose a file to upload." }, { status: 400 });
  if (!allowedTypes[documentType]) return json({ error: "Choose a valid document type." }, { status: 400 });
  if (!allowedTypes[documentType].includes(file.type)) {
    return json({ error: "That file type does not match the selected document slot." }, { status: 400 });
  }

  const id = randomId("doc_");
  const safeName = file.name.replace(/[^\w.\- ]+/g, "").slice(0, 120) || "client-file";
  const r2Key = `clients/${params.id}/documents/${id}/${safeName}`;
  await env.CLIENT_FILES.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { userId: params.id, documentId: id },
  });

  await env.DB.prepare(
    `insert into client_documents
      (id, user_id, title, document_type, file_name, content_type, r2_key, size_bytes)
     values (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, params.id, title || safeName, documentType, safeName, file.type, r2Key, file.size || null).run();

  return json({ ok: true, id });
}
