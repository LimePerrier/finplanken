// POST /api/checkout/complete
// Called by the browser after the HelcimPay.js modal finishes. Validates
// the returned transaction against the session's secret token, then:
//   - retainer  -> stores the tokenized customer + creates a subscription
//                  (which bills the first semi-annual period)
//   - plan_only -> records the one-time purchase
// Finally issues a portal invite so the client can set a password.
import { json, loadIntent, randomId, randomToken, sha256 } from "../../_lib/checkout.js";
import { readJson, appUrl } from "../../_lib/auth.js";
import { TIERS, centsToAmount, formatCad } from "../../_lib/pricing.js";
import { validateCheckoutResponse, ensurePaymentPlan, createSubscription, HelcimError } from "../../_lib/helcim.js";
import { sendEmail } from "../../_lib/email.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const intent = await loadIntent(env, body.intentId, body.accessToken);
  if (!intent) return json({ error: "This checkout session has expired. Please start again." }, { status: 400 });
  if (intent.status === "paid") {
    return json({ ok: true, alreadyComplete: true, setupUrl: null });
  }

  const transaction = body.transaction && typeof body.transaction === "object" ? body.transaction : null;
  const hash = body.hash;
  if (!transaction) return json({ error: "Missing payment confirmation." }, { status: 400 });

  // Authenticity: the hash must match our server-held secret token.
  const validHash = await validateCheckoutResponse(intent.helcim_secret_token, transaction, hash);
  if (!validHash) {
    await markFailed(env, intent.id);
    await logEvent(env, intent.id, null, "hash_validation_failed", null, null, null, transaction);
    return json({ error: "We couldn't verify this payment. No charge was completed." }, { status: 400 });
  }

  const status = String(transaction.status || transaction.transactionStatus || "").toUpperCase();
  const approved = status === "APPROVED" || status === "COMPLETED" || transaction.approved === true;
  const customerCode = transaction.customerCode || transaction.customer || null;
  const cardToken = transaction.cardToken || transaction.cardBatchId || null;
  const transactionId = String(transaction.transactionId || transaction.cardTransactionId || transaction.id || "");
  const bankLast4 = transaction.bankAccountLast4 || transaction.accountNumberLast4 || null;

  if (!approved && intent.plan_type === "plan_only") {
    await markFailed(env, intent.id);
    await logEvent(env, intent.id, null, "payment_declined", null, null, transactionId, transaction);
    return json({ error: "The payment was declined. Please try another method." }, { status: 402 });
  }

  const isRetainer = intent.plan_type === "retainer";
  let subscriptionRowId = null;

  try {
    if (isRetainer) {
      if (!customerCode) throw new HelcimError("Payment processor did not return a customer to bill.", 502);
      const tierDef = TIERS[intent.tier];
      // Send Helcim the PRE-TAX base; Helcim applies GST/HST as a separate
      // line on the receipt, based on the customer's province (set via the
      // customer's billing address in session.js). Helcim's per-province tax
      // rates must be configured to match functions/_lib/pricing.js, or the
      // client's charge will differ from the checkout quote.
      const recurringAmount = centsToAmount(intent.base_amount_cents);
      const planId = await ensurePaymentPlan(env, {
        name: `Bracket Planning – ${tierDef.name} (semi-annual)`,
        description: `${tierDef.name} retainer billed every 6 months, plus GST/HST.`,
        recurringAmount,
        currency: intent.currency,
        billingPeriod: "monthly",
        billingPeriodIncrements: 6,
      });
      const { subscriptionId } = await createSubscription(env, {
        customerCode,
        paymentPlanId: planId,
        recurringAmount,
        paymentMethod: intent.payment_method === "ach" ? "ach" : "card",
      });

      subscriptionRowId = randomId("sub_");
      await env.DB.prepare(
        `insert into subscriptions
           (id, user_id, intent_id, tier, payment_method, recurring_amount_cents, currency,
            billing_period, billing_period_increments, helcim_customer_code, helcim_subscription_id,
            helcim_payment_plan_id, status, activated_at)
         values (?, ?, ?, ?, ?, ?, ?, 'monthly', 6, ?, ?, ?, 'active', strftime('%Y-%m-%dT%H:%M:%fZ','now'))`
      ).bind(
        subscriptionRowId, intent.user_id, intent.id, intent.tier, intent.payment_method,
        intent.base_amount_cents, intent.currency, customerCode, String(subscriptionId), String(planId)
      ).run();

      await env.DB.prepare(
        "update checkout_intents set helcim_subscription_id = ? where id = ?"
      ).bind(String(subscriptionId), intent.id).run();
    }
  } catch (err) {
    // Payment method captured but subscription setup failed: don't tell the
    // client they're done. Flag it for manual follow-up.
    await logEvent(env, intent.id, null, "subscription_setup_failed", null, null, transactionId, {
      error: err instanceof HelcimError ? err.detail || err.message : String(err),
    });
    await markFailed(env, intent.id);
    const message =
      err instanceof HelcimError ? err.message : "We saved your payment method but couldn't finish setting up billing.";
    return json({ error: `${message} Please contact info@bracketplanning.ca and we'll complete it for you.` }, { status: 502 });
  }

  // Record the transaction + close out the intent.
  await env.DB.prepare(
    `update checkout_intents
       set status = 'paid', helcim_customer_code = ?, helcim_card_token = ?, helcim_transaction_id = ?,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     where id = ?`
  ).bind(customerCode, cardToken, transactionId, intent.id).run();

  if (bankLast4) {
    await env.DB.prepare(
      "update engagement_agreements set bank_last4 = ? where intent_id = ? and agreement_type = 'pad'"
    ).bind(String(bankLast4), intent.id).run();
  }

  await logEvent(
    env, intent.id, subscriptionRowId,
    isRetainer ? "subscription_activated" : "purchase_paid",
    intent.total_amount_cents, intent.currency, transactionId, transaction
  );

  // Onboard the client: issue a portal invite if they haven't set a password,
  // and email them the set-password link (falling back to the on-screen link).
  let setupUrl = null;
  let inviteEmailed = false;
  const user = intent.user_id
    ? await env.DB.prepare("select id, status, password_hash from users where id = ?").bind(intent.user_id).first()
    : null;
  if (user && user.status !== "active" && !user.password_hash) {
    const token = randomToken();
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
    await env.DB.prepare(
      "insert into invites (id, user_id, email, token_hash, expires_at) values (?, ?, ?, ?, ?)"
    ).bind(randomId("inv_"), user.id, intent.email, tokenHash, expiresAt).run();
    setupUrl = `${appUrl(request, env)}/accept-invite.html?token=${encodeURIComponent(token)}`;

    try {
      const tierName = TIERS[intent.tier] ? TIERS[intent.tier].name : "planning";
      const firstName = (intent.name || "").trim().split(/\s+/)[0] || "there";
      const emailResult = await sendEmail(env, {
        to: intent.email,
        subject: "Welcome to Bracket Planning — your account & next steps",
        text:
          `Hi ${firstName},\n\n` +
          `Thank you for choosing Bracket Planning. Your ${tierName} engagement is confirmed, ` +
          `and we're glad to be working with you.\n\n` +
          `STEP 1 — SET YOUR PASSWORD\n` +
          `Create your client portal password using this secure link (it expires in 14 days):\n` +
          `${setupUrl}\n\n` +
          `STEP 2 — COMPLETE YOUR QUESTIONNAIRE & UPLOAD YOUR DOCUMENTS\n` +
          `Once you're logged in:\n` +
          `  1. Select "Questionnaire" from the menu.\n` +
          `  2. Fill it out to the best of your ability — if you don't have everything, just complete what you can.\n` +
          `  3. Upload your supporting documents (statements, tax forms, etc.) in the same place.\n\n` +
          `That's all we need to get started. We'll pick up your questionnaire and documents on our end, ` +
          `begin building your financial plan, and reach out to schedule your draft plan meeting.\n\n` +
          `Questions? Just reply to this email or contact info@bracketplanning.ca.\n\n` +
          `— Bracket Planning\n` +
          `Independent, advice-only financial planning`,
        html:
          `<p>Hi ${escapeHtml(firstName)},</p>` +
          `<p>Thank you for choosing Bracket Planning. Your <strong>${escapeHtml(tierName)}</strong> engagement ` +
          `is confirmed, and we're glad to be working with you.</p>` +
          `<h3 style="margin:20px 0 6px;font-size:15px">Step 1 — Set your password</h3>` +
          `<p>Create your client portal password using this secure link (it expires in 14 days):<br>` +
          `<a href="${setupUrl}">Set my client portal password</a></p>` +
          `<h3 style="margin:20px 0 6px;font-size:15px">Step 2 — Complete your questionnaire &amp; upload your documents</h3>` +
          `<p>Once you're logged in:</p>` +
          `<ol>` +
          `<li>Select <strong>Questionnaire</strong> from the menu.</li>` +
          `<li>Fill it out to the best of your ability — if you don't have everything, just complete what you can.</li>` +
          `<li>Upload your supporting documents (statements, tax forms, etc.) in the same place.</li>` +
          `</ol>` +
          `<p>That's all we need to get started. We'll pick up your questionnaire and documents on our end, ` +
          `begin building your financial plan, and reach out to schedule your draft plan meeting.</p>` +
          `<p>Questions? Just reply to this email or contact info@bracketplanning.ca.</p>` +
          `<p style="color:#5d6962">— Bracket Planning<br>Independent, advice-only financial planning</p>`,
      });
      inviteEmailed = !!emailResult.sent;
    } catch {
      inviteEmailed = false; // never let email trouble undo a completed payment
    }
  }

  return json({
    ok: true,
    recurring: isRetainer,
    amountPaid: formatCad(intent.total_amount_cents),
    setupUrl,
    inviteEmailed,
  });
}

async function markFailed(env, intentId) {
  await env.DB.prepare(
    "update checkout_intents set status = 'failed', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') where id = ? and status != 'paid'"
  ).bind(intentId).run();
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

async function logEvent(env, intentId, subscriptionId, type, amountCents, currency, txId, raw) {
  await env.DB.prepare(
    `insert into payment_events (id, intent_id, subscription_id, event_type, amount_cents, currency, helcim_transaction_id, raw_json)
     values (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    randomId("evt_"), intentId, subscriptionId, type, amountCents, currency, txId || null,
    raw ? JSON.stringify(raw).slice(0, 20000) : null
  ).run();
}
