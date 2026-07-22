// ============================================================
//  Helcim API v2 wrapper
//  All calls run server-side (never from the browser — the
//  initialize endpoint rejects cross-origin front-end calls, and
//  the API token must never reach the client).
//
//  Docs: https://devdocs.helcim.com/docs/overview-of-helcim-api
//        https://devdocs.helcim.com/docs/overview-of-helcimpayjs
//        https://devdocs.helcim.com/docs/recurring-api
//
//  NOTE: the recurring/payment-plan request shapes below follow
//  Helcim's documented field names (billingPeriod,
//  billingPeriodIncrements, recurringAmount, paymentPlanId,
//  customerCode). Confirm them against your account's live API
//  reference before go-live — they are centralized here so any
//  field-name change is a one-file edit.
// ============================================================

const API_BASE = "https://api.helcim.com/v2";

function apiToken(env) {
  const token = String(env.HELCIM_API_TOKEN || "").trim();
  if (!token) throw new HelcimError("Payments are not configured yet.", 503);
  return token;
}

export class HelcimError extends Error {
  constructor(message, status = 502, detail = null) {
    super(message);
    this.name = "HelcimError";
    this.status = status;
    this.detail = detail;
  }
}

async function helcimFetch(env, path, { method = "POST", body, idempotencyKey } = {}) {
  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    "api-token": apiToken(env),
  };
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new HelcimError("Could not reach the payment processor.", 502, String(err));
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message =
      (data && (data.errors || data.error || data.message)) || `Payment processor error (${res.status}).`;
    throw new HelcimError(
      typeof message === "string" ? message : "Payment processor rejected the request.",
      502,
      data
    );
  }
  return data;
}

// --- HelcimPay.js checkout session -------------------------------------

// Creates a checkout session and returns { checkoutToken, secretToken }.
// secretToken must stay server-side; it's used to validate the response.
export async function initializeCheckout(env, {
  paymentType,      // 'verify' (retainer, tokenize) | 'purchase' (one-time)
  paymentMethod,    // 'cc' | 'ach'
  amount,           // decimal number, tax-inclusive total for one-time; token verify uses a nominal amount
  currency = "CAD",
  taxAmount,        // decimal number, optional
  customerCode,     // optional existing Helcim customer
  customerRequest,  // { customerName, contactName, email, ... } to create/lookup a customer
  invoiceNumber,
  setAsDefaultPaymentMethod, // 1 to store the verified method as default (retainer)
}) {
  const body = {
    paymentType,
    amount,
    currency,
    paymentMethod,
  };
  if (taxAmount != null) body.taxAmount = taxAmount;
  if (customerCode) body.customerCode = customerCode;
  if (customerRequest) body.customerRequest = customerRequest;
  if (invoiceNumber) body.invoiceNumber = invoiceNumber;
  if (setAsDefaultPaymentMethod != null) body.setAsDefaultPaymentMethod = setAsDefaultPaymentMethod;

  const data = await helcimFetch(env, "/helcim-pay/initialize", { body });
  const checkoutToken = data.checkoutToken || (data.data && data.data.checkoutToken);
  const secretToken = data.secretToken || (data.data && data.data.secretToken);
  if (!checkoutToken || !secretToken) {
    throw new HelcimError("Payment processor did not return a checkout session.", 502, data);
  }
  return { checkoutToken, secretToken };
}

// Validate a HelcimPay.js transaction response against the session's
// secretToken. Helcim computes hash = sha256( JSON.stringify(data) + secretToken ).
export async function validateCheckoutResponse(secretToken, transactionData, providedHash) {
  if (!secretToken || !providedHash || !transactionData) return false;
  const payload = JSON.stringify(transactionData) + secretToken;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  const computed = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqualHex(computed, String(providedHash).toLowerCase());
}

// --- Recurring / subscriptions -----------------------------------------

// Reusable payment plan per tier + billing cadence. We look one up by
// name and create it only if missing, so we don't spawn duplicates.
export async function ensurePaymentPlan(env, {
  name,
  description,
  recurringAmount,      // decimal number
  currency = "CAD",
  billingPeriod = "monthly",
  billingPeriodIncrements = 6,
}) {
  // Try to find an existing plan by name.
  try {
    const existing = await helcimFetch(env, "/payment-plans", { method: "GET" });
    const list = Array.isArray(existing) ? existing : existing && existing.data;
    if (Array.isArray(list)) {
      const match = list.find((p) => (p.name || p.planName) === name);
      if (match) return match.id || match.planId;
    }
  } catch {
    // fall through to creation
  }

  const created = await helcimFetch(env, "/payment-plans", {
    body: {
      name,
      description,
      type: "recurring",
      recurringAmount,
      currency,
      billingPeriod,
      billingPeriodIncrements,
    },
  });
  const id = created.id || created.planId || (created.data && (created.data.id || created.data.planId));
  if (!id) throw new HelcimError("Could not create the billing plan.", 502, created);
  return id;
}

// Subscribe an existing customer (with a stored default payment method)
// to a payment plan. activationDate defaults to today (immediate).
export async function createSubscription(env, {
  customerCode,
  paymentPlanId,
  recurringAmount,
  activationDate,
  paymentMethod, // 'card' | 'ach'
}) {
  const subscription = {
    customerCode,
    paymentPlanId,
    recurringAmount,
    activationDate: activationDate || new Date().toISOString().slice(0, 10),
  };
  if (paymentMethod) subscription.paymentMethod = paymentMethod;

  // Helcim's create-subscriptions endpoint takes an array of subscriptions.
  const data = await helcimFetch(env, "/subscriptions", { body: [subscription] });
  const first = Array.isArray(data) ? data[0] : data.data ? data.data[0] : data;
  const id = first && (first.id || first.subscriptionId);
  if (!id) throw new HelcimError("Could not activate the subscription.", 502, data);
  return { subscriptionId: id, raw: first };
}

// --- helpers -----------------------------------------------------------

function timingSafeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
