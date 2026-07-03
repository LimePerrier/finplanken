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

  let dashboardData = null;
  if (documentType === "spreadsheet") {
    const dashboardDataJson = String(form.get("dashboardData") || "").trim();
    if (dashboardDataJson) {
      try {
        dashboardData = parseDashboardData(dashboardDataJson);
      } catch (error) {
        return json({ error: error.message }, { status: 400 });
      }
    }
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

  if (dashboardData) {
    await env.DB.prepare("delete from client_dashboard_data where user_id = ?").bind(params.id).run();
    await env.DB.prepare(
      `insert into client_dashboard_data
        (id, user_id, source_document_id, plan_data_json, updated_at)
       values (?, ?, ?, ?, ?)`
    ).bind(randomId("dash_"), params.id, id, JSON.stringify(dashboardData), new Date().toISOString()).run();
  }

  return json({ ok: true, id });
}

function parseDashboardData(value) {
  let data;
  try {
    data = JSON.parse(value);
  } catch (error) {
    throw new Error("Spreadsheet dashboard data could not be parsed.");
  }
  if (!Array.isArray(data) || !data.length) {
    throw new Error("Spreadsheet dashboard data is empty.");
  }
  return data.map((row) => ({
    year: number(row.year),
    age: number(row.age),
    expBase: number(row.expBase),
    expAdd: number(row.expAdd),
    employment: number(row.employment),
    divNonElig: number(row.divNonElig),
    divElig: number(row.divElig),
    otherInc: number(row.otherInc),
    cpp: number(row.cpp),
    cppSurv: number(row.cppSurv),
    oas: number(row.oas),
    oasClawback: number(row.oasClawback),
    govTotal: number(row.govTotal),
    taxableInc: number(row.taxableInc),
    cppEi: number(row.cppEi),
    totalTax: number(row.totalTax),
    marginal: number(row.marginal),
    effective: number(row.effective),
    totalTaxPrem: number(row.totalTaxPrem),
    rrspVal: number(row.rrspVal),
    rrspContrib: number(row.rrspContrib),
    tfsaVal: number(row.tfsaVal),
    tfsaContrib: number(row.tfsaContrib),
    nonRegVal: number(row.nonRegVal),
    nonRegContrib: number(row.nonRegContrib),
    allTypesVal: number(row.allTypesVal),
    allTypesContrib: number(row.allTypesContrib),
    house: number(row.house),
    realTotal: number(row.realTotal),
    realPurchSold: number(row.realPurchSold),
    mortOwing: number(row.mortOwing),
    mortPaid: number(row.mortPaid),
    netWorth: number(row.netWorth),
    estateBeforeTax: number(row.estateBeforeTax),
    estateTaxInc: number(row.estateTaxInc),
    taxOnEstate: number(row.taxOnEstate),
  })).filter((row) => row.year && row.age);
}

function number(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}
