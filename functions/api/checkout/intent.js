// POST /api/checkout/intent
// Starts a checkout: validates the selection, computes the authoritative
// price + tax, creates or links a client user record, and returns the
// rendered legal documents for the client to review and sign.
import { json, randomId, randomToken, sha256, loadIntent } from "../../_lib/checkout.js";
import { readJson } from "../../_lib/auth.js";
import { quote, formatCad } from "../../_lib/pricing.js";
import { ENGAGEMENT_LETTER, PAD_AGREEMENT, renderDoc } from "../../_lib/engagement-doc.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const tier = String(body.tier || "").trim();
  const planType = String(body.planType || "").trim();
  const province = String(body.province || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const code = String(body.code || "").trim();

  if (!name) return json({ error: "Please enter your name." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  let priced;
  try {
    priced = quote({ tier, planType, province, code });
  } catch (err) {
    return json({ error: err.message }, { status: 400 });
  }

  // Link to an existing user by email, or create an invited one so the
  // client lands in the portal already onboarded after they pay.
  let user = await env.DB.prepare("select id, status from users where email = ?").bind(email).first();
  if (!user) {
    const userId = randomId("user_");
    await env.DB.prepare(
      "insert into users (id, email, name, role, status) values (?, ?, ?, 'client', 'invited')"
    ).bind(userId, email, name).run();
    user = { id: userId, status: "invited" };
  }

  const accessToken = randomToken();
  const accessTokenHash = await sha256(accessToken);
  const intentId = randomId("chk_");

  await env.DB.prepare(
    `insert into checkout_intents
       (id, user_id, email, name, province, tier, plan_type, access_token_hash,
        base_amount_cents, tax_rate_bps, tax_amount_cents, total_amount_cents, currency, status)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'started')`
  ).bind(
    intentId, user.id, email, name, province, tier, planType, accessTokenHash,
    priced.baseAmountCents, priced.taxRateBps, priced.taxAmountCents, priced.totalAmountCents, priced.currency
  ).run();

  const docValues = {
    clientName: name,
    tierName: priced.tierName,
    planLabel: priced.planLabel,
    provinceName: priced.provinceName,
    baseAmount: formatCad(priced.baseAmountCents),
    taxAmount: formatCad(priced.taxAmountCents),
    totalAmount: formatCad(priced.totalAmountCents),
  };

  return json({
    ok: true,
    intentId,
    accessToken,
    quote: {
      tier: priced.tier,
      tierName: priced.tierName,
      planType: priced.planType,
      planLabel: priced.planLabel,
      recurring: priced.recurring,
      provinceName: priced.provinceName,
      baseAmount: formatCad(priced.baseAmountCents),
      taxAmount: formatCad(priced.taxAmountCents),
      totalAmount: formatCad(priced.totalAmountCents),
      taxRatePct: priced.taxRateBps / 100,
      discountLabel: priced.discount ? priced.discount.label : null,
      listAmount: priced.discount ? formatCad(priced.listBaseCents) : null,
    },
    engagementDoc: renderDoc(ENGAGEMENT_LETTER, docValues),
    padDoc: renderDoc(PAD_AGREEMENT, docValues),
  });
}
