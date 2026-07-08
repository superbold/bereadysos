# BeReady SOS

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

A household disaster-preparedness planner. Track what you have, spot expiring supplies, and see how ready you are for a target number of days.

## What it does

- **Inventory** — Log water, food, medical supplies, and gear with quantities and expiration dates
- **Expiration alerts** — See what is expiring soon or already past date
- **Day planning** — Set a target (3, 7, 14, 30+ days) and view gaps in your supplies
- **Household sharing** — One shared plan for your household (planned)

## Current status

Auth, email confirmation, database, household settings, inventory, dashboard coverage, plan gaps, and expiring views are live.

**Backlog & decisions:** [docs/BACKLOG.md](./docs/BACKLOG.md) · [docs/DECISIONS.md](./docs/DECISIONS.md)

## Project structure

```
app/
├── composables/        # useHousehold, useAuthRedirectUrl
├── layouts/
│   ├── auth.vue          # Sign-in / sign-up (standalone, mobile-first)
│   ├── auth-confirm.vue  # Email confirmation callback (centered)
│   └── default.vue       # Main app shell with navigation
├── pages/
│   ├── auth/             # Login, signup, forgot/reset password
│   ├── confirm.vue       # "You're ready!" after email confirm
│   ├── index.vue         # Dashboard (coverage summary)
│   ├── inventory.vue     # Inventory CRUD
│   ├── plan.vue          # Gap list for target days
│   ├── expiring.vue      # Expiration-sorted view
│   └── settings.vue      # Household name, headcount, target days
server/api/auth/          # token_hash confirm + recover endpoints
supabase/migrations/      # SQL schema (apply in Supabase dashboard)
```

---

## Tech stack

- [Nuxt 4](https://nuxt.com) + [Vue 3](https://vuejs.org)
- [Nuxt UI 4](https://ui.nuxt.com) + Tailwind CSS
- [Supabase](https://supabase.com) — auth and database
- [Resend](https://resend.com) — transactional email (auth confirmations via Supabase SMTP)
- [Vercel](https://vercel.com) — hosting
- [pnpm](https://pnpm.io) — package manager
- [Zod](https://zod.dev) — form validation

## Vercel, Supabase & Resend

Three services, three jobs. They connect through configuration — not through code in this repo calling Resend directly.

### Who does what

| Service | Role | Configured in |
|---------|------|----------------|
| **Vercel** | Hosts the Nuxt app (`bereadysos.com`) | Vercel project → Domains, Environment Variables |
| **Supabase** | Auth, sessions, database (future) | Supabase dashboard |
| **Resend** | Delivers auth emails on behalf of Supabase | Resend dashboard + Supabase SMTP settings |

The app talks to **Supabase** only. It never calls the Resend API. Supabase sends confirmation and password-reset emails over Resend SMTP.

### Sign-up flow

```
User signs up on bereadysos.com
        ↓
Nuxt app → Supabase Auth (signUp)
        ↓
Supabase sends confirmation email via Resend SMTP
        ↓
User clicks link in inbox
        ↓
Browser opens /confirm on bereadysos.com (Vercel)
        ↓
@nuxtjs/supabase establishes session → "You're ready!" → dashboard
```

### What goes where

**Vercel environment variables** (Project → Settings → Environment Variables):

| Variable | Purpose |
|----------|---------|
| `NUXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NUXT_PUBLIC_SUPABASE_KEY` | Supabase anon (public) key |

Do **not** put the Resend API key in Vercel for the current auth flow. Supabase holds it as the SMTP password.

**Supabase** (Authentication → Emails → SMTP):

| Field | Value |
|-------|--------|
| Host | `smtp.resend.com` |
| Port | `465` (or `587`) |
| Username | `resend` |
| Password | Resend API key (`re_…`) |
| Sender email | `noreply@send.bereadysos.com` |

**Supabase** (Authentication → URL Configuration):

| Setting | Example |
|---------|---------|
| Site URL | `https://bereadysos.com` |
| Redirect URLs | `https://bereadysos.com/confirm`, `https://bereadysos.com/auth/reset-password`, `https://bereadysos.com/api/auth/recover`, `http://localhost:3000/confirm`, `http://localhost:3000/auth/reset-password`, `http://localhost:3000/api/auth/recover` |

The `/confirm` route must match `callback` in `nuxt.config.ts` and be listed in Supabase redirect URLs.

### Password reset flow

```
User clicks "Forgot your password?" on sign in
        ↓
/auth/forgot-password → Supabase resetPasswordForEmail
        ↓
Supabase sends recovery email via Resend SMTP
        ↓
User clicks link → GET /api/auth/recover?token_hash=…&type=recovery
        ↓
Server verifyOtp (recovery) → session cookie → /auth/reset-password
        ↓
User sets new password → sign in
```

Update the **Reset password** email template in Supabase (Authentication → Emails) to use `token_hash` — see [docs/DECISIONS.md](./docs/DECISIONS.md).

**Branded templates:** copy HTML from `supabase/email-templates/` into Supabase (Confirm signup + Reset password). Same green primary, Public Sans, and BeReady SOS card layout as the auth pages.

### Domain & DNS (email vs website)

These are separate:

| Domain | Purpose | Where |
|--------|---------|--------|
| `bereadysos.com` | Website (Nuxt app) | Vercel → Domains |
| `send.bereadysos.com` | Outbound email only | Resend → Domains, DNS records in Vercel |

`send.bereadysos.com` is **not** a Vercel deployment. It is an email subdomain verified in Resend by adding TXT, DKIM (`resend._domainkey.send`), and MX records to **Vercel DNS** (or wherever `bereadysos.com` DNS is managed). Once Resend shows the domain as verified, `noreply@send.bereadysos.com` is valid as the Supabase sender address.

### Local development

Use the same Supabase project. Add `http://localhost:3000/confirm` (or `:3001` if 3000 is in use) to Supabase redirect URLs. Resend delivers real confirmation emails in dev — use a real inbox when testing.

**Important:** If **Site URL** in Supabase is `http://localhost:3000`, confirmation emails will link to localhost. That only works on the machine running `pnpm dev` — clicking the link on a phone will fail. For real sign-up tests, set **Site URL** to your production URL (`https://bereadysos.com`) and sign up on the live site. Keep localhost URLs in **Redirect URLs** only for local dev.

### Troubleshooting auth

| Symptom | Cause | Fix |
|---------|--------|-----|
| Safari can't connect to `localhost` | Site URL is localhost; link opened on another device | Set Supabase **Site URL** to `https://bereadysos.com` |
| Link goes to `/?code=...` instead of `/confirm` | `emailRedirectTo` not set on sign-up | Fixed in app — sign up again for a new email |
| Link opens but spins forever | Redirect URL not allowlisted | Add `https://bereadysos.com/confirm` to Supabase **Redirect URLs** |
| Blank screen after confirm; dashboard appears after F5 | Client-side redirect to `/` ran before the session cookie was written; auth middleware bounced between `/` and `/auth/login` | Fixed in app — `/confirm` uses a full-page redirect (`external: true`) after the session is established |
| Email link opens login ("Welcome back") instead of "You're ready!" | Link landed on `/` or `/auth/login` with `?code=`; auth middleware stripped the code and sent user to login | Fixed in app — global middleware forwards auth query params to `/confirm` |
| `PKCE code verifier not found in storage` | Default `{{ .ConfirmationURL }}` uses PKCE; link opened on a different device/browser than sign-up | Update Supabase **Confirm signup** email template to use `token_hash` (see below) |

**Blank screen detail:** After email confirmation, Supabase sets a session cookie. A soft client-side navigation to `/` can run before that cookie is visible to Nuxt's auth middleware, which redirects unauthenticated users to login while the Supabase client still holds the user in memory — causing a redirect loop and a blank page. A full page load reads the cookie correctly (which is why F5 worked). The app now waits for `getSession()` on `/confirm`, then redirects with a full reload.

### Confirm signup email template (required)

The default `{{ .ConfirmationURL }}` uses PKCE and **only works if the user opens the email on the same browser where they signed up**. For phone mail apps and cross-device use, edit **Authentication → Emails → Templates → Confirm signup**.

Replace the confirmation link with:

```html
<h2>Confirm your BeReady SOS account</h2>
<p>Tap the button below to confirm your email and open your dashboard.</p>
<p>
  <a href="{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=email">
    Confirm your email
  </a>
</p>
```

Ensure **Site URL** is `https://bereadysos.com` (not localhost). The app verifies the token on the server, sets the session cookie, then shows **"You're ready!"** on `/confirm`.

You can style the HTML further; Resend delivers whatever Supabase sends.

## Setup

### Prerequisites

- Node.js **24** (see `.nvmrc`; `package.json` `engines` pins `>=24`)
- pnpm
- A [Supabase](https://supabase.com) project
- [Resend](https://resend.com) account with `send.bereadysos.com` verified (for branded auth email)
- [Vercel](https://vercel.com) project connected to this repo (for production)

### Environment

Requires a local `.env` with Supabase credentials — the dev server will warn if anything is missing.

### Install and run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — unauthenticated visits redirect to `/auth/login`.

### Production

Deploy via Vercel (connected to the GitHub repo). Set `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_KEY` in Vercel before the first production deploy.

Vercel uses the Node version from `package.json` `engines` (24). If the dashboard override differs, set **Project → Settings → Build and Deployment → Node.js Version** to **24.x** to match local and CI.

```bash
pnpm build
pnpm preview   # local production preview only
```

## Testing

Quality checks run locally and on every **push** to GitHub via [Actions](.github/workflows/ci.yml).

### Run locally

```bash
pnpm test        # unit tests (shared/coverage.ts)
pnpm lint        # ESLint
pnpm typecheck   # Nuxt / TypeScript
```

Coverage math lives in `shared/coverage.ts` with tests in `test/coverage.test.ts` — no Supabase or browser required.

### CI on GitHub

Each push triggers the **ci** workflow (Ubuntu, Node 24): install → test → lint → typecheck.

| Where to look | What you see |
|---------------|--------------|
| **Actions** tab | Full log for each run |
| Commit / PR checks | Green ✓ or red ✗ next to the latest push |

Re-running an old failed workflow does not help unless that commit already includes the fix — push a new commit instead.

## License

MIT
