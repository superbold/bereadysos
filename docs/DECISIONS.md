# BeReady SOS — Decisions

Short record of choices worth remembering across sessions. Add a dated entry when we lock something in.

---

## Product

| Decision | Choice | Notes |
|----------|--------|-------|
| Product name | **BeReady SOS** | Repo: `bereadysos`; working folder `sos-mk1` |
| Primary domain | `bereadysos.com` | App on Vercel |
| MVP scope | Inventory + expiration + days planning | Household sharing deferred past MVP |
| Default target days | 7 (presets: 3/7/14/30/90) | Editable in `/settings` |
| Headcount | Single number per household | Named members later if needed |

---

## Future concepts (not scheduled)

### Pets in the household

Track pets in settings (backlog **Later**). Factor into water/food planning — e.g. extra water per pet per day. Details TBD when promoted from backlog.

### Scenarios: shelter in place vs go mobile

Emergencies split roughly two ways:

| Mode | Example | Planning focus |
|------|---------|----------------|
| **Shelter in place** | Storm, power outage at home | Pantry, garage, bulk water — home inventory |
| **Go mobile** | Evacuation, grab-and-go | What’s in each portable container |

For mobile readiness, users need **“What items are where?”** — not just totals across the household.

**Container examples:**
- Small backpack (essentials)
- Minor medical bag
- Medium bin (food cache)
- Vehicle kit
- Go-bag by the door

**Possible model (when we build this):**
- `containers` — name, type, scenario tags (`shelter` / `mobile` / both), location note
- Items link to a **container** (optional) in addition to category
- Views: by container (“what’s in this backpack?”), by item (“where is the flashlight?”), gap analysis per scenario (“evacuation kit ready for 3 days?”)

**Relation to MVP:** Phase 3 inventory may add a simple `location` text field first; full container/scenario model is a later layer on top.

---

## Stack

| Decision | Choice | Notes |
|----------|--------|-------|
| Framework | Nuxt 4.4.x + Vue 3 | `app/` directory layout |
| UI | Nuxt UI 4 + Tailwind | Primary color: green |
| Backend | Supabase | Auth + Postgres; household & categories live |
| Email delivery | Resend via Supabase SMTP | App does **not** call Resend API |
| Hosting | Vercel | Env: `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY` only |
| Package manager | pnpm | |
| Node.js | **24** | `.nvmrc`, `package.json` engines, GitHub Actions CI; Vercel reads `engines` |
| Migrations | `supabase/migrations/` in repo | Apply via SQL Editor; see `supabase/README.md` |

---

## Auth & email

| Decision | Choice | Notes |
|----------|--------|-------|
| Auth pages layout | Separate from app shell | `auth.vue`, `auth-confirm.vue` vs `default.vue` |
| Confirm route | `/confirm` | Matches `callback` in `nuxt.config.ts` |
| Email confirm link | `token_hash` + server verify | **Not** default `{{ .ConfirmationURL }}` (PKCE) |
| Server confirm endpoint | `GET /api/auth/confirm` | `verifyOtp` + cookie session, then redirect to `/confirm?success=1` |
| Post-confirm redirect | Full page load (`external: true`) | Avoids session cookie / middleware race |
| Sign-up after submit | Stay on “Check your email” | Don’t send user to login immediately |
| `.env.example` | Not in repo | Dev server warns; keeps template out of git |

### Supabase email template (Confirm signup)

```html
<a href="{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=email">
  Confirm your email
</a>
```

**Site URL:** `https://bereadysos.com` (not localhost for production emails).

### Resend / DNS

| Item | Value |
|------|--------|
| Sending subdomain | `send.bereadysos.com` |
| Sender address | `noreply@send.bereadysos.com` |
| SMTP host | `smtp.resend.com` |
| SMTP user | `resend` |
| SMTP password | Resend API key |

Email subdomain is **DNS only** in Vercel — not a Vercel deployment.

---

## Data model

| Decision | Choice | Notes |
|----------|--------|-------|
| Tenancy | `household_id` on all inventory rows | RLS by membership |
| Categories | Seeded reference table | `consumable` vs `checklist` calc types |
| Household bootstrap | `bootstrap_household()` RPC | `SECURITY DEFINER`; inserts `households` + `household_members` atomically — avoids RLS chicken-and-egg on first sign-in |
| Days math | Pure functions in `shared/coverage.ts` | Testable via `pnpm test`; used on dashboard |
| Profiles table | Defer | Auth users in `auth.users`; `household_members` links users |
| Migrations | See list below | Applied in Supabase SQL Editor |

### Migrations (in order)

| File | Purpose |
|------|---------|
| `20260623120000_initial_schema.sql` | Tables, RLS, category seed |
| `20260623130000_household_one_per_user.sql` | Optional unique index on `household_members.user_id` |
| `20260623140000_bootstrap_household_rpc.sql` | `bootstrap_household()` function |

### Tables

| Table | Purpose |
|-------|---------|
| `households` | `name`, `headcount`, `target_days` |
| `household_members` | `user_id`, `role` (`owner` \| `member`) |
| `categories` | Seeded; `slug`, `calc_type`, defaults for days math |
| `items` | Inventory lines; optional `location` (containers later) |

---

## Conventions

| Decision | Choice |
|----------|--------|
| Commits | Only when explicitly requested |
| README focus | Product + deploy; backlog in `docs/` |
| Nav brand (app shell) | Still “SOS Planner” in header — align to “BeReady SOS” when polishing |

---

## Changelog (decision log)

| Date | Decision |
|------|----------|
| 2026-06 | Greenfield Nuxt UI template → BeReady SOS |
| 2026-06 | Resend on `send.bereadysos.com`, not root domain |
| 2026-06 | Replaced PKCE email links with `token_hash` + `/api/auth/confirm` after cross-tab / phone failures |
| 2026-06 | Added `docs/BACKLOG.md` + `docs/DECISIONS.md` for session continuity |
| 2026-06 | Logged future idea: shelter-in-place vs mobile scenarios + container tracking |
| 2026-06 | Phase 1 database schema + RLS + category seed in `supabase/migrations/` |
| 2026-06 | Phase 2: `/settings`, `useHousehold`, dashboard household summary |
| 2026-06 | `bootstrap_household()` RPC — household create must not use client INSERT + SELECT (RLS) |
| 2026-06 | Phase 4: dashboard coverage, target-day presets, `shared/coverage.ts` + tests |
| 2026-06 | Standardize on Node 24 (CI, `.nvmrc`, `package.json` engines) |
