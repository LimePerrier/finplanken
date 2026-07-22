// POST /api/checkout/sign
// Records an electronic signature on the engagement letter or PAD
// agreement. Stores the exact rendered text's hash plus IP / user agent
// / timestamp as an immutable audit record.
import { json, loadIntent, randomId, clientIp } from "../../_lib/checkout.js";
import { readJson } from "../../_lib/auth.js";
import { formatCad } from "../../_lib/pricing.js";
import { TIERS } from "../../_lib/pricing.js";
import { getDoc, renderDoc, hashDoc } from "../../_lib/engagement-doc.js";
import { PROVINCE_TAX } from "../../_lib/pricing.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const intent = await loadIntent(env, body.intentId, body.accessToken);
  if (!intent) return json({ error: "This checkout session has expired. Please start again." }, { status: 400 });
  if (intent.status === "paid") return json({ error: "This checkout is already complete." }, { status: 409 });

  const agreementType = String(body.agreementType || "").trim();
  if (agreementType !== "engagement_letter" && agreementType !== "pad") {
    return json({ error: "Unknown agreement." }, { status: 400 });
  }
  const signerName = String(body.signerName || "").trim();
  if (signerName.length < 2) return json({ error: "Please type your full name to sign." }, { status: 400 });

  const doc = getDoc(agreementType);
  if (!doc) return json({ error: "Unknown agreement." }, { status: 400 });

  // Re-render server-side from the same source the price came from, so the
  // hash reflects our canonical text — not anything supplied by the client.
  const tierName = TIERS[intent.tier] ? TIERS[intent.tier].name : intent.tier;
  const provinceName = PROVINCE_TAX[intent.province] ? PROVINCE_TAX[intent.province].name : intent.province;
  const planLabel = intent.plan_type === "retainer" ? "Semi-annual retainer" : "One-time financial plan";
  const rendered = renderDoc(doc, {
    clientName: intent.name,
    tierName,
    planLabel,
    provinceName,
    baseAmount: formatCad(intent.base_amount_cents),
    taxAmount: formatCad(intent.tax_amount_cents),
    totalAmount: formatCad(intent.total_amount_cents),
  });
  const docHash = await hashDoc(rendered);

  await env.DB.prepare(
    `insert into engagement_agreements
       (id, intent_id, user_id, agreement_type, doc_version, doc_hash,
        signer_name, signer_email, signed_ip, signed_user_agent)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    randomId("sig_"), intent.id, intent.user_id, agreementType, doc.version, docHash,
    signerName, intent.email, clientIp(request), request.headers.get("user-agent") || ""
  ).run();

  if (agreementType === "engagement_letter" && intent.status === "started") {
    await env.DB.prepare(
      "update checkout_intents set status = 'agreement_signed', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') where id = ?"
    ).bind(intent.id).run();
  }

  return json({ ok: true, agreementType, docVersion: doc.version });
}
