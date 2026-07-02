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
- `accept-invite.html?token=...` lets the client set a password.
- `login.html` signs the client in.
- `portal.html` is the blank authenticated client portal shell.

Required Cloudflare setup:

1. Create a D1 database and replace the placeholder `database_id` in `wrangler.toml`.
2. Apply `schema.sql` to the D1 database.
3. Add Cloudflare Pages environment variables:
   - `ADMIN_INVITE_TOKEN`: private token used by `admin-invite.html`
   - `APP_URL`: production site origin, for example `https://bracketplanning.ca`
   - `INVITE_FROM`: verified sender address for invite emails
4. To send invite emails through Cloudflare Email Service, onboard the sending domain and add:
   - `CLOUDFLARE_ACCOUNT_ID`: your Cloudflare account ID
   - `CLOUDFLARE_EMAIL_API_TOKEN`: secret API token with Email Sending edit permission

Without email settings, the admin page still returns a test invite link.
