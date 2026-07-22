# Helcim Setup & Go-Live Guide

This is the operational checklist for turning on payments. Work top to bottom.
The **tax step (Section 3) and the code deploy are coupled** — read the warning
in Section 3 before you deploy anything.

> Helcim occasionally renames menus. Where a click-path here doesn't match what
> you see, use Helcim's own help articles (linked inline) as the source of truth.
> Anything marked **⚠ verify** is something to confirm in *test mode* before real
> clients, because it moves real money.

---

## 0. Prerequisites

- A Helcim account, approved by their risk team for **payments** and, if you want
  the debit option, **ACH / PAD** (Canada).
- Your **GST/HST registration number**.
- Access to your **Cloudflare Pages** project settings (to set environment variables).

---

## 1. API token → Cloudflare

1. In Helcim: **All Tools → Integrations → API Access** (or Settings → API Access).
2. Generate an **API token** with permission for **Payments** and **Recurring**.
   Copy it once — Helcim only shows it in full at creation.
3. In Cloudflare Pages → your project → **Settings → Environment variables**, add:
   - `HELCIM_API_TOKEN` = the token above.
4. Redeploy (or it takes effect on next deploy). Until this is set, checkout returns
   a clear "payments not configured" message and never charges anyone.

Docs: https://devdocs.helcim.com/docs/overview-of-helcim-api

---

## 2. Whitelist your domain for HelcimPay.js

The payment window (HelcimPay.js) only renders on approved domains.

1. In Helcim, find the **HelcimPay.js / domain whitelist** setting.
2. Add your production domain (e.g. `bracketplanning.ca`) and any staging domain.

Docs: https://devdocs.helcim.com/docs/overview-of-helcimpayjs

---

## 3. Tax configuration  ⚠ the important one

Our checkout now sends Helcim the **pre-tax base fee**, and **Helcim adds GST/HST
as its own line** based on the client's province. For that to be correct you must
configure Helcim's tax rates to match ours exactly.

### 3a. Set tax to follow the customer's province

1. In Helcim: **Settings → Taxes** (tax rate settings).
2. For **recurring / subscription tax**, choose **"Based on customer's location."**
   (Not "merchant's location" — that would charge everyone your province's rate,
   which is wrong for out-of-province clients.)

Docs: https://learn.helcim.com/docs/applying-taxes-during-checkout

### 3b. Enter these rates (must match `functions/_lib/pricing.js`)

| Province / Territory | Rate | Type |
|---|---|---|
| Alberta (AB) | 5% | GST |
| British Columbia (BC) | 5% | GST |
| Manitoba (MB) | 5% | GST |
| Saskatchewan (SK) | 5% | GST |
| Quebec (QC) | 5% | GST¹ |
| Northwest Territories (NT) | 5% | GST |
| Nunavut (NU) | 5% | GST |
| Yukon (YT) | 5% | GST |
| Ontario (ON) | 13% | HST |
| Nova Scotia (NS) | 14% | HST |
| New Brunswick (NB) | 15% | HST |
| Newfoundland & Labrador (NL) | 15% | HST |
| Prince Edward Island (PE) | 15% | HST |

¹ **Quebec:** our system charges 5% GST only. **QST (9.975%) is handled
separately** and is not in this flow — confirm your QST obligations with your
accountant before taking Quebec clients.

> **If you ever change a rate**, change it in **both** places — Helcim **and**
> `functions/_lib/pricing.js` — or the checkout quote and the actual charge will
> disagree. Nova Scotia's rate in particular has moved recently; keep an eye on it.

### ⚠ Deploy order (do not skip)

- Configure the Helcim rates above **before** the "send base amount" code is live.
- If the code goes live first, Helcim will charge only the base with **no GST**,
  i.e. every client is **undercharged the tax**. Configure Helcim → test → then deploy.

---

## 4. Brand the receipt (so it's professional + CRA-valid)

Clients are auto-debited, so what they receive is a **receipt** (proof of payment),
not an invoice. Make it yours and make it show the tax.

1. In Helcim: **Settings → Receipt Theme Designer** (receipt design).
2. **Content tab** — turn ON: **Business Name**, **Legal Name**
   (Wealth Architects Inc.), **Contact Information**, and **Tax Number**
   (your GST/HST registration number). The Tax Number toggle is what makes the
   receipt valid for business clients claiming input tax credits.
3. **Design tab** — upload your logo and set colours (forest/gold to match the site).
4. Confirm the receipt shows **base + GST/HST as a separate line + total**.

Docs: https://learn.helcim.com/docs/design-receipts

---

## 4b. Customer email notifications

Helcim can email clients automatically around each recurring charge — no build needed.

1. **All Tools → Settings → Communications → Recurring.**
2. Turn on the **"Billing heads-up"** (upcoming-payment) reminder and set the lead
   time (e.g. **7 days** before the charge). Optionally copy your business on it.
3. Consider also enabling the **failed-payment** and **card-expiring** notices.

This satisfies the courtesy expectation for PAD and complements the agreement's
commitment to give 10 days' notice of any amount change.

Docs: https://learn.helcim.com/docs/recurring-payment-notifications

---

## 5. ACH / PAD (only if you offer the debit option)

1. Ensure your account is **approved for ACH/PAD** (Canada). This needs Helcim's
   risk review and can take a few business days.
2. No extra code config — our checkout collects the signed PAD agreement before the
   first debit, which is the compliance requirement.

Docs: https://learn.helcim.com/docs/manage-customer-bank-accounts

---

## 6. Webhooks — intentionally NOT used

We deliberately did **not** wire Helcim webhooks. Helcim's webhook events are
transaction/terminal events, not subscription-status events, so they can't reliably
tell us "a renewal failed" or "you cancelled this in the dashboard." Instead:

- **Day-to-day billing (amounts, history, failed charges, refunds, cancellations)**
  lives in the **Helcim dashboard** — that's your source of truth.
- When you cancel a subscription in Helcim, click **"Mark cancelled"** in our Admin
  → Subscriptions table to sync our record.

Nothing to configure here — just know this is by design.

---

## 7. Go-live test checklist (run in TEST mode first)

Do these in Helcim's **test / sandbox mode** before pointing real clients at checkout.
Each row is a full run through `checkout.html`.

| # | Scenario | What to verify |
|---|---|---|
| 1 | Retainer, **credit card**, Alberta | Charged **$2,835** ($2,700 + 5%). Receipt shows base + GST line + your GST#. A **subscription** exists in Helcim set to **every 6 months**. |
| 2 | Retainer, **debit (PAD)**, Ontario | PAD agreement captured. Charged **$3,051** ($2,700 + 13%). Subscription every 6 months. |
| 3 | Retainer, credit, **Nova Scotia** | Tax line = **14%** (not 5%) — confirms customer-location tax is working. |
| 4 | Retainer with code **`LEGACY2500`**, Alberta | Charged **$2,625** ($2,500 + 5%). Subscription recurring amount = **$2,500 base**. |
| 5 | **One-time** plan-only, credit, Ontario | Single charge, no subscription created. Tax itemized on receipt. |
| 6 | Discounted client, second period | (Optional, if sandbox lets you fast-forward) confirm the **6-month renewal** re-charges the same discounted amount automatically. |

For every scenario, also confirm:
- The **total on the Helcim receipt matches the "Due today" total shown at checkout**, to the cent.
- The client received the **welcome email** with the set-password link.
- A row appears in **Admin → Subscriptions** with the right client, plan, and status.

### ⚠ Fields to confirm live (built to Helcim's docs, not yet proven on your account)
- The subscription **recurring amount** and **billingPeriod / billingPeriodIncrements**
  (every 6 months) actually schedule as expected.
- A subscription's recurring amount can **differ from the plan default** (this is what
  makes the discount work — Scenario 4).
- The `customerRequest.billingAddress` province field name is accepted, so
  customer-location tax picks the right rate (Scenario 3).

If any of these behave differently in your account, tell your developer — they're all
centralized in `functions/_lib/helcim.js` and easy to adjust.

---

## 8. Flip it on

1. Helcim tax rates configured (Section 3) ✅
2. Receipt branded with GST# (Section 4) ✅
3. All test scenarios in Section 7 pass ✅
4. `HELCIM_API_TOKEN` set in Cloudflare ✅
5. Deploy the site.

Then send the normal pricing-page links to clients, and the grandfathered-client link
(`checkout.html?tier=…&plan=retainer&code=LEGACY2500`) to that one client.
