import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { readFile, readFile as readFileAsync } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { questions } from "../functions/api/client/questionnaire.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 8788);

const mockDocuments = [
  {
    id: "doc_plan_pdf",
    title: "Full Financial Plan",
    document_type: "plan_pdf",
    file_name: "Harley & Jodi (Draft Plan - Shares Included) - March 20 2025.pdf",
    content_type: "application/pdf"
  },
  {
    id: "doc_spreadsheet",
    title: "Projection Workbook",
    document_type: "spreadsheet",
    file_name: "Projections for John Snapper (2026-06-29).xlsx",
    content_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  },
  {
    id: "doc_commentary",
    title: "Planner Commentary",
    document_type: "docx",
    file_name: "Shawna_Lindsay_Commentary_Reformatted.docx",
    content_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }
];

const fileMap = {
  doc_plan_pdf: "tmp/john-snapper-reference/client-files/john-snapper/02-plan-pdf/Harley & Jodi (Draft Plan - Shares Included) - March 20 2025.pdf",
  doc_spreadsheet: "tmp/john-snapper-reference/client-files/john-snapper/01-dashboard-data/Projections for John Snapper (2026-06-29).xlsx",
  doc_commentary: "tmp/john-snapper-reference/client-files/john-snapper/03-commentary-docx/Shawna_Lindsay_Commentary_Reformatted.docx"
};

const mockPlanData = await loadMockPlanData();
const mockClient = {
  id: "user_mock",
  email: "matt.lahey@live.com",
  name: "Matthew Lahey",
  role: "client",
  status: "active",
  created_at: "2026-07-02T12:00:00.000Z",
  updated_at: "2026-07-02T12:00:00.000Z"
};

let questionnaire = {
  id: "qr_mock",
  status: "draft",
  answers: {
    planning_questions: "Confirm retirement timing, tax-efficient drawdowns, and estate outcomes.",
    financial_goals: "Coordinate corporate assets with family cash flow.",
    client_details: [
      { name: "Matthew Lahey", email: "matt.lahey@live.com", occupation: "Business owner" }
    ]
  }
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  try {
    if (url.pathname === "/api/auth/me") {
      return sendJson(res, { user: { id: "user_mock", name: "Matthew Lahey", email: "matt.lahey@live.com" } });
    }
    if (url.pathname === "/api/auth/logout") {
      return sendJson(res, { ok: true });
    }
    if (url.pathname === "/api/client/documents") {
      return sendJson(res, { documents: mockDocuments.filter((doc) => doc.document_type !== "spreadsheet") });
    }
    if (url.pathname === "/api/client/dashboard") {
      return sendJson(res, { planData: mockPlanData, updatedAt: "2026-07-02T20:00:00.000Z" });
    }
    if (url.pathname.startsWith("/api/client/documents/") && url.pathname.endsWith("/download")) {
      const id = decodeURIComponent(url.pathname.split("/")[4] || "");
      return sendFile(res, fileMap[id], mockDocuments.find((doc) => doc.id === id)?.content_type);
    }
    if (url.pathname === "/api/client/questionnaire" && req.method === "GET") {
      return sendJson(res, { questions, response: questionnaire });
    }
    if (url.pathname === "/api/client/questionnaire" && req.method === "POST") {
      const body = await readBody(req);
      questionnaire = {
        ...questionnaire,
        status: body.submit ? "submitted" : "draft",
        answers: body.answers || {}
      };
      return sendJson(res, { ok: true, status: questionnaire.status });
    }
    if (url.pathname === "/api/admin/clients") {
      return sendJson(res, { clients: [{ ...mockClient, record_count: 0 }] });
    }
    if (url.pathname === "/api/admin/clients/user_mock") {
      return sendJson(res, {
        client: mockClient,
        records: [],
        invites: [{ id: "inv_mock", email: mockClient.email, created_at: "2026-07-02T12:00:00.000Z" }],
        documents: mockDocuments,
        questionnaire: {
          ...questionnaire,
          questions,
          updated_at: new Date().toISOString()
        }
      });
    }
    if (url.pathname === "/api/admin/clients/user_mock/questionnaire" && req.method === "POST") {
      const body = await readBody(req);
      questionnaire = {
        ...questionnaire,
        status: body.status === "submitted" ? "submitted" : "draft",
        answers: body.answers || {}
      };
      return sendJson(res, { ok: true, status: questionnaire.status });
    }
    return serveStatic(url.pathname, res);
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(error.stack || String(error));
  }
});

server.listen(port, () => {
  console.log(`Local UI server running at http://localhost:${port}`);
});

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function sendFile(res, relPath, contentType = "application/octet-stream") {
  if (!relPath) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const filePath = path.join(root, relPath);
  if (!existsSync(filePath)) {
    const fallback = fallbackFile(contentType);
    res.writeHead(200, {
      "content-type": contentType,
      "content-length": fallback.length
    });
    res.end(fallback);
    return;
  }
  res.writeHead(200, {
    "content-type": contentType,
    "content-length": statSync(filePath).size
  });
  createReadStream(filePath).pipe(res);
}

function fallbackFile(contentType) {
  if (contentType === "application/pdf") {
    return Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 75 >>\nstream\nBT /F1 18 Tf 72 720 Td (Bracket Planning sample client report) Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000234 00000 n \n0000000359 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n429\n%%EOF\n"
    );
  }
  return Buffer.from("Bracket Planning sample client file for local UI testing.\n");
}

async function serveStatic(urlPath, res) {
  const cleanPath = decodeURIComponent(urlPath).replace(/^\/+/, "") || "index.html";
  const filePath = path.resolve(root, cleanPath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const finalPath = existsSync(filePath) && statSync(filePath).isDirectory()
    ? path.join(filePath, "index.html")
    : filePath;
  if (!existsSync(finalPath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(finalPath).toLowerCase();
  const type = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pdf": "application/pdf",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }[ext] || "application/octet-stream";
  res.writeHead(200, { "content-type": type });
  res.end(await readFileAsync(finalPath));
}

async function loadMockPlanData() {
  const dashboardPath = path.join(root, "tmp/john-snapper-reference/dashboard.html");
  if (existsSync(dashboardPath)) {
    const html = await readFile(dashboardPath, "utf8");
    const match = html.match(/<script id="planData" type="application\/json">([\s\S]*?)<\/script>/);
    if (match) return JSON.parse(match[1]);
  }
  return [
    { year: 2026, age: 59, expBase: 54000, expAdd: 0, employment: 100000, divNonElig: 0, divElig: 0, otherInc: 5000, cpp: 0, cppSurv: 0, oas: 0, oasClawback: 0, govTotal: 0, taxableInc: 92945, cppEi: 5770, totalTax: 17338, marginal: 0.3, effective: 0.19, totalTaxPrem: 23108, rrspVal: 482250, rrspContrib: 12000, tfsaVal: 52350, tfsaContrib: 3000, nonRegVal: 296752, nonRegContrib: 5692, allTypesVal: 831352, allTypesContrib: 20692, house: 561000, realTotal: 561000, realPurchSold: 0, mortOwing: 38770, mortPaid: 7200, netWorth: 1353583, estateBeforeTax: 1353583, estateTaxInc: 485043, taxOnEstate: 215987 },
    { year: 2032, age: 65, expBase: 61171, expAdd: 0, employment: 0, divNonElig: 0, divElig: 0, otherInc: 5000, cpp: 22024, cppSurv: 0, oas: 10091, oasClawback: 0, govTotal: 32114, taxableInc: 41720, cppEi: 0, totalTax: 1708, marginal: 0.22, effective: 0.04, totalTaxPrem: 1708, rrspVal: 696618, rrspContrib: 0, tfsaVal: 87560, tfsaContrib: 0, nonRegVal: 354662, nonRegContrib: -31193, allTypesVal: 1138839, allTypesContrib: -31193, house: 631777, realTotal: 631777, realPurchSold: 0, mortOwing: 0, mortPaid: 5429, netWorth: 1770616, estateBeforeTax: 1770616, estateTaxInc: 704755, taxOnEstate: 318065 },
    { year: 2067, age: 100, expBase: 126605, expAdd: 0, employment: 0, divNonElig: 0, divElig: 0, otherInc: 5000, cpp: 45582, cppSurv: 0, oas: 22973, oasClawback: 0, govTotal: 68555, taxableInc: 115380, cppEi: 0, totalTax: 9648, marginal: 0.22, effective: 0.08, totalTaxPrem: 9648, rrspVal: 112640, rrspContrib: -26947, tfsaVal: 640877, tfsaContrib: 0, nonRegVal: 613093, nonRegContrib: -35751, allTypesVal: 1366610, allTypesContrib: -62698, house: 1263484, realTotal: 1263484, realPurchSold: 0, mortOwing: 0, mortPaid: 0, netWorth: 2630094, estateBeforeTax: 2630094, estateTaxInc: 168702, taxOnEstate: 64459 }
  ];
}
