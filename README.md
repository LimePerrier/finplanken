# Financial Planner Website

Static marketing website (HTML/CSS/JS + images). No build step, no server.

## Local preview
Open `index.html` in a browser, or run a tiny static server from this folder:

```bash
python -m http.server 8080
# then visit http://localhost:8080
```

## Deploy — Cloudflare Pages
This repository **is** the site root, so deployment needs no build:

| Setting                | Value           |
| ---------------------- | --------------- |
| Framework preset       | None            |
| Build command          | *(leave empty)* |
| Build output directory | `/` (root)      |

- **Git method:** Cloudflare → Workers & Pages → Create → Pages → Connect to Git → pick this repo → settings above → Save and Deploy. Pushes auto-deploy.
- **Direct upload:** drag this folder's contents into Pages → Upload assets.
- Add a custom domain in the Pages project (SSL is automatic).

`_headers` (in this folder) adds security headers + asset caching automatically on Cloudflare Pages.

## Editing CSS or JS — cache busting

`assets/styles.css` and `assets/nav.js` keep the same filename forever, and Cloudflare
caches them for hours. HTML is never cached, so the `?v=` query string on those two
`<link>`/`<script>` tags is what actually forces visitors to pick up a change. Ship new
HTML against an unchanged `?v=` and the site renders with the old stylesheet — the layout
looks broken and no error appears anywhere.

**This is handled for you.** `tools/stamp-assets.mjs` rewrites `?v=` to a hash of each
file's contents, and `.githooks/pre-commit` runs it on every commit. Enable the hook once
per clone:

```bash
git config core.hooksPath .githooks
```

Useful manually too:

```bash
node tools/stamp-assets.mjs          # restamp now
node tools/stamp-assets.mjs --check  # exit 1 if stale (for CI)
```

> Note: the Cloudflare zone's **Browser Cache TTL** setting overrides the `Cache-Control`
> values in `_headers` — observed serving `max-age=14400` where `_headers` asked for 300.
> Setting it to *Respect Existing Headers* in the Cloudflare dashboard would make
> `_headers` authoritative, but the content hash above works regardless.

## Before going live — replace placeholders
- [x] Brand / logo in the nav and footer - currently Bracket Planning
- [x] Email address (top bar, CTAs, footer, contact page) - currently `info@bracketplanning.ca`
- [x] Name / brand in the footer copyright
- [ ] Headshot image at `assets/ken-headshot.jpg`
- [ ] Booking link on the "Book a call" buttons (e.g. Calendly / Cal.com)
- [ ] Wire the contact form to a handler (e.g. Web3Forms / Formspree)
- [ ] Remove the gold "concept mockup" ribbon at the top of each page
- [ ] Page titles / meta descriptions and a favicon

## Portal MVP
This repo includes a minimal Cloudflare Pages client-portal workflow:

- `admin-invite.html` creates a client invite.
- `admin.html` lists clients, shows client records, suspends/reactivates login, and adds admin data.
- Admin can upload client PDFs, spreadsheets, and Word documents to private R2 storage. Spreadsheet uploads are parsed into dashboard data for the client portal; the spreadsheet itself stays admin-only.
- `accept-invite.html?token=...` lets the client set a password.
- `login.html` signs the client in.
- `portal.html` shows the client dashboard, lets clients view assigned PDF/DOCX documents, and lets clients complete the intake questionnaire.

Required Cloudflare setup:

1. Create a D1 database and replace the placeholder `database_id` in `wrangler.toml`.
2. Create an R2 bucket named `bracket-planning-client-files` and bind it to Pages as `CLIENT_FILES`.
3. Apply `schema.sql` to the D1 database. Re-run it after schema changes; it uses `if not exists` for safe additive setup.
4. Add Cloudflare Pages environment variables:
   - `ADMIN_INVITE_TOKEN`: private token used by `admin-invite.html`. To support multiple admins, list several tokens separated by commas or newlines; any one of them is accepted, so each admin can have (and you can revoke) their own.
   - `APP_URL`: production site origin, for example `https://bracketplanning.ca`
   - `INVITE_FROM`: verified sender address for invite emails
5. To send invite emails through Cloudflare Email Service, onboard the sending domain and add:
   - `CLOUDFLARE_ACCOUNT_ID`: your Cloudflare account ID
   - `CLOUDFLARE_EMAIL_API_TOKEN`: secret API token with Email Sending edit permission

Without email settings, the admin page still returns a test invite link.

## Payments (Helcim)

> **Setup & go-live steps** (Helcim tax rates, receipt branding, API token, and the
> test-mode checklist) live in [`docs/helcim-setup.md`](docs/helcim-setup.md).
> Configure Helcim's tax **before** deploying, or clients are undercharged GST.

`fees.html` "Start this plan" and "one-time" links lead to `checkout.html`, a
five-step flow: choose plan → enter details (province sets GST/HST) → sign the
Letter of Engagement → choose credit or debit (debit adds a PAD agreement) →
pay in a HelcimPay.js modal. Semi-annual tiers become recurring subscriptions
billed every 6 months; plan-only tiers are a single charge. A paid client is
issued a portal invite so they can set a password.

Where things live:
- `functions/_lib/pricing.js` — tier prices (in cents) and per-province GST/HST.
  **This is the only place prices/tax are set**; the browser can't override them.
- `functions/_lib/engagement-doc.js` — the Letter of Engagement and PAD wording,
  each versioned. Bump the `version` when you change wording; signatures store
  the version + a content hash so you can prove what a client agreed to.
- `functions/_lib/helcim.js` — Helcim API v2 wrapper (checkout init, response
  validation, payment plans, subscriptions).
- `functions/_lib/email.js` — shared sender (EMAIL binding or Cloudflare REST),
  used to email the portal invite and cancellation notices.
- `functions/api/checkout/*` — `intent`, `sign`, `session`, `complete`.
- New tables in `schema.sql`: `checkout_intents`, `engagement_agreements`,
  `subscriptions`, `payment_events`.

After payment, the client is emailed a set-password link (with an on-screen
fallback link on the confirmation screen). This reuses the same email settings
as the admin invite (`INVITE_FROM` + either the `EMAIL` binding or
`CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_EMAIL_API_TOKEN`).

### Subscription management (post-payment)

Design principle: **Helcim is the source of truth for billing** (amounts,
payment history, failed charges, refunds, and the actual cancel). The site
keeps only what Helcim can't: the checkout flow, the signed Letter of
Engagement audit trail, the portal account, and a light status view. There is
**no billing webhook** — Helcim's webhooks are transaction/terminal events, not
subscription-status events, so status is synced manually (below) rather than
mirrored automatically.

- **Client portal** (`portal.html` → **Billing** tab) shows the client's plan,
  amount, payment method and status, read-only. It deliberately omits an exact
  "next payment" date (that lives in Helcim and a computed guess could drift).
  Backed by `GET /api/client/subscription`.
- **Cancellation is request-only** — clients click "Request cancellation", which
  records the request and emails the firm (`POST /api/client/subscription` with
  `action: request_cancellation`). The email goes to `CANCELLATION_TO` (optional
  env var; falls back to `ADMIN_NOTIFY_EMAIL`, then `info@bracketplanning.ca`).
- **Admin** (`admin.html`) has a slim **Subscriptions** table — Client · Plan ·
  Status (with the cancellation-request flag) · a **"View in Helcim"** link ·
  a **"Mark cancelled"** action. No amounts (those live in Helcim). Backed by
  `GET /api/admin/subscriptions`.
- **Closing the cancellation loop:** you cancel billing in the Helcim dashboard,
  then click **"Mark cancelled"** in admin — this flips the row to cancelled and
  clears the request flag (`PATCH /api/admin/subscriptions/:id`). It only updates
  our records; it does not call Helcim.

Additional Cloudflare setup for payments:

1. Re-apply `schema.sql` to add the payments tables (additive, `if not exists`).
2. Add the Pages environment variable `HELCIM_API_TOKEN` (a Helcim API access
   token with payments + recurring scope). Without it, checkout returns a clear
   "not configured" message and never charges anyone. `APP_URL` (above) is
   reused to build the post-payment portal invite link.
3. In your Helcim account, whitelist your production domain for HelcimPay.js and
   enable ACH/PAD if you want the debit option (Canadian PAD requires the signed
   agreement, which this flow collects before the first debit).

> **Before go-live, verify against your live Helcim account:** (a) the recurring
> **payment-plan / subscription request field names in `helcim.js` — they follow
> Helcim's documented names but the exact reference pages weren't reachable at
> build time; and (b) the shape of the HelcimPay.js success message in
> `assets/checkout.js` (`parseHelcimMessage`), which normalizes a couple of known
> shapes. Run one real test transaction of each type (credit purchase, debit
> purchase, credit retainer, debit retainer) in Helcim's test mode first.
> Confirm your GST/HST registration and place-of-supply obligations with your
> accountant — the rate table in `pricing.js` is a starting point, not tax advice.
