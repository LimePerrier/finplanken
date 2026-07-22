// POST /api/checkout/session
// Once the engagement letter (and PAD, for debit) is signed, create a
// HelcimPay.js checkout session and hand the browser only the
// checkoutToken. The secretToken is kept server-side for validation.
import { json, loadIntent } from "../../_lib/checkout.js";
import { readJson } from "../../_lib/auth.js";
import { centsToAmount } from "../../_lib/pricing.js";
import { initializeCheckout, HelcimError } from "../../_lib/helcim.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const intent = await loadIntent(env, body.intentId, body.accessToken);
  if (!intent) return json({ error: "This checkout session has expired. Please start again." }, { status: 400 });
  if (intent.status === "paid") return json({ error: "This checkout is already complete." }, { status: 409 });

  const paymentMethod = String(body.paymentMethod || "").trim(); // 'cc' | 'ach'
  if (paymentMethod !== "cc" && paymentMethod !== "ach") {
    return json({ error: "Please choose credit or debit." }, { status: 400 });
  }

  // Gate: engagement letter must be signed; debit additionally needs PAD.
  const signed = await env.DB.prepare(
    "select agreement_type from engagement_agreements where intent_id = ?"
  ).bind(intent.id).all();
  const signedTypes = new Set((signed.results || []).map((r) => r.agreement_type));
  if (!signedTypes.has("engagement_letter")) {
    return json({ error: "Please sign the letter of engagement first." }, { status: 400 });
  }
  if (paymentMethod === "ach" && !signedTypes.has("pad")) {
    return json({ error: "Please accept the pre-authorized debit agreement first." }, { status: 400 });
  }

  const isRetainer = intent.plan_type === "retainer";

  let session;
  try {
    session = await initializeCheckout(env, {
      // Retainer: tokenize + store the default method, then we create the
      // subscription server-side (which bills the first period). One-time:
      // charge the full amount now.
      paymentType: isRetainer ? "verify" : "purchase",
      paymentMethod,
      amount: isRetainer ? 0 : centsToAmount(intent.total_amount_cents),
      currency: intent.currency,
      taxAmount: isRetainer ? undefined : centsToAmount(intent.tax_amount_cents),
      customerCode: intent.helcim_customer_code || undefined,
      // Pass the client's province so Helcim's "based on customer location"
      // tax applies the correct GST/HST rate on the recurring receipt.
      // (Verify the customerRequest address field names against the live
      //  Helcim API before go-live.)
      customerRequest: intent.helcim_customer_code
        ? undefined
        : {
            contactName: intent.name,
            email: intent.email,
            billingAddress: { province: intent.province, country: "CAN" },
          },
      invoiceNumber: intent.id,
      setAsDefaultPaymentMethod: isRetainer ? 1 : undefined,
    });
  } catch (err) {
    if (err instanceof HelcimError) return json({ error: err.message }, { status: err.status });
    return json({ error: "Could not start the payment. Please try again." }, { status: 502 });
  }

  await env.DB.prepare(
    `update checkout_intents
       set payment_method = ?, helcim_checkout_token = ?, helcim_secret_token = ?,
           status = 'payment_initialized', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     where id = ?`
  ).bind(paymentMethod, session.checkoutToken, session.secretToken, intent.id).run();

  return json({ ok: true, checkoutToken: session.checkoutToken });
}
