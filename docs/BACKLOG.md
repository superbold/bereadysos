# BeReady SOS — Backlog

Living list of what’s shipped and what’s next. Update when a phase lands or priorities change.

---

## Done

### Foundation
- [x] Nuxt 4 + Vue 3 + Nuxt UI + pnpm scaffold
- [x] GitHub repo (`superbold/bereadysos`) + Vercel deploy
- [x] Supabase Auth (sign up, sign in, sign out)
- [x] Separate auth layout (`auth`, `auth-confirm`) vs app shell (`default`)
- [x] Mobile-friendly, light/dark auth screens

### Email & confirmation
- [x] Resend SMTP via Supabase (`noreply@send.bereadysos.com`)
- [x] `send.bereadysos.com` domain verified in Resend + Vercel DNS
- [x] Sign-up “Check your email” screen (no redirect to login)
- [x] `/confirm` — “You’re ready!” success flow + error states
- [x] `/api/auth/confirm` server route (`token_hash` — works cross-device / new tab)
- [x] Auth callback middleware (`?code=` / `?token_hash=` → confirm)
- [x] Full-page redirect to dashboard after confirm (session cookie fix)
- [x] Supabase email template uses `token_hash` (not default `ConfirmationURL` / PKCE)

### App shell
- [x] Dashboard with household summary (`/`)
- [x] Nav links (Inventory, Plan, Expiring, Settings) — inventory/plan/expiring pages not built yet
- [x] Settings gear tooltip (“Settings” on hover)
- [x] README with Vercel / Supabase / Resend flow

### Docs
- [x] `docs/BACKLOG.md` (this file)
- [x] `docs/DECISIONS.md`
- [x] `supabase/README.md` (migration apply notes)

### Database (Phase 1) — complete
- [x] Migration: `households`, `household_members`, `categories`, `items` (`supabase/migrations/`)
- [x] Row Level Security (household-scoped)
- [x] Seed categories (water, food, medical, hygiene, power, tools, documents)
- [x] TypeScript types (`app/types/database.types.ts`)
- [x] **Apply migration in Supabase** (`20260623120000_initial_schema.sql`)

### Household (Phase 2) — complete
- [x] `useHousehold` composable + client plugin (auto-create on sign-in)
- [x] `/settings` — name, headcount, target days (3/7/14/30/90 presets)
- [x] Dashboard shows household summary
- [x] `bootstrap_household()` RPC — atomic household + member create (RLS fix)
- [x] **Apply migration** `20260623140000_bootstrap_household_rpc.sql`
- [ ] **Apply migration** `20260623130000_household_one_per_user.sql` (optional — one household per user)

---

## In progress

_Nothing active — pick from **Next** below._

---

## Next

### Phase 3 — Inventory
- [ ] `/inventory` — list, search, filter
- [ ] Add / edit / delete items (name, category, qty, unit, expiration, location, notes)
- [ ] Empty states + mobile-friendly forms

### Phase 4 — Dashboard
- [ ] Target-day presets (3 / 7 / 14 / 30 / 90) on dashboard
- [ ] Coverage summary per category (water, food, checklist categories)
- [ ] Expiring-soon count + quick links
- [ ] `shared/` coverage math (unit-testable pure functions)

### Phase 5 — Plan & expiring
- [ ] `/plan` — gap list for selected target days (“need +12 gal water”)
- [ ] `/expiring` — sortable expiration view

---

## Later

- [ ] **Add pets to household** — track pets in settings; factor into water/food planning
- [ ] **Scenarios & containers** — shelter-in-place vs mobile/evacuation; “what items are where?” (see `DECISIONS.md`)
- [ ] Household invites / sharing
- [ ] Starter templates (72-hour kit, earthquake, winter storm)
- [ ] Branded HTML email template in Supabase (beyond plain link)
- [ ] CSV import / export shopping list
- [ ] Consumption log (decrement qty when used)
- [ ] Push / email expiration reminders (Edge Functions + cron)
- [ ] PWA / offline
- [ ] Custom domain polish (`bereadysos.com` everywhere in copy; nav still says “SOS Planner”)

---

## How to use this file

1. Move items from **Next** → **Done** when shipped (check the box).
2. Add new ideas under **Later**; promote to **Next** when ready to build.
3. Keep **In progress** to one small slice at a time.
