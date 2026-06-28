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
- [x] Nav links (Inventory, Plan, Expiring, Settings)
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
- [x] **Apply migration** `20260623130000_household_one_per_user.sql` (one household per user)

---

### Inventory (Phase 3) — complete
- [x] `/inventory` — list, search, filter
- [x] Add / edit / delete items (name, category, qty, unit, expiration, location, notes)
- [x] Empty states + mobile-friendly forms (`useInventory`, `InventoryItemForm`, slideover)

### Dashboard (Phase 4) — complete
- [x] Target-day presets (3 / 7 / 14 / 30 / 90) on dashboard
- [x] Coverage summary per category (water, food, checklist categories)
- [x] Expiring-soon count + quick links
- [x] `shared/coverage.ts` coverage math + `pnpm test` (Node test runner)

### Expiring (Phase 5 — partial)
- [x] `/expiring` — sortable expiration view (shipped with Phase 4 quick links)

### Plan (Phase 5) — complete
- [x] `/plan` — gap list for selected target days (“need +12 gal water”)
- [x] `computeAllCategoryGaps`, `formatGapLabel` in `shared/coverage.ts` + tests

### Global alerts panel — complete
- [x] `shared/alerts.ts` + `test/alerts.test.ts` — expiration, plan gaps, coverage (when not duplicated)
- [x] `useAlerts` composable
- [x] Header bell + badge count + slideover (`AlertsBell.vue`); icon, severity color, title + detail per row
- [x] Auth hero unchanged (no real warnings before sign-in)

### Owner display name — complete
- [x] `profiles` table + `ensure_profile()` RPC (`20260625120000_profiles.sql`)
- [x] First name on signup + settings; header shows “{name}'s plan” (`AppShellBrand.vue`)
- [x] `useProfile`, `useHouseholdPlan` — owner name ready for invited guests later

---

## In progress

_Nothing active — pick from **Next** below._

---

## Next

_MVP core phases complete. Pick from **Later** or promote an item when ready._

---

## Later

- [ ] **Custom favicon** — replace default Nuxt `/favicon.ico` (see `app/app.vue` + `public/`); use BeReady SOS / shield-check branding
- [ ] **Add pets to household** — track pets in settings; factor into water/food planning
- [ ] **Scenarios & containers** — shelter-in-place vs mobile/evacuation; “what items are where?” (see `DECISIONS.md`)
- [ ] **Household invites** — owner invites guest by email; guest sees “{owner}'s plan”; owner can revoke (`member` role exists; see `DECISIONS.md`)
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
