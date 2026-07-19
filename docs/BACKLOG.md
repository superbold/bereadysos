# BeReady SOS — Backlog

Living list of what’s shipped and what’s next. Update when a phase lands or priorities change.

**Product priority:** [Solo owner first](./DECISIONS.md#solo-owner-first-priority) — make the plan owner finish and maintain a plan alone before leaning on multi-role coordination.

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
- [x] Forgot password — `/auth/forgot-password`, recovery email, `/auth/reset-password`
- [x] Branded HTML email templates in repo (`supabase/email-templates/`) — paste into Supabase Confirm + Reset password

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

### Household invites & coordination — shipped (advanced path)
- [x] `household_invites` + sharing RPCs; Settings invite (role picker)
- [x] Roles: inventory keeper, shopper, watcher
- [x] `/restock` Phase A — create run from gaps, send to shopper, mark shopping complete
- [x] Phase B — intake pending + inventory keeper handoff (log lines, submit for owner review)
- [x] Plan picker — multi-membership cards + active plan context
- [x] Coordination migrations applied (`…enum`, `…coordination`, `…shop_run_intake`)
- [x] Inventory read-only for shopper / watcher

---

## In progress

### Solo owner v1 — maintain the plan alone

Decision: [docs/DECISIONS.md — Solo owner first](./DECISIONS.md#solo-owner-first-priority).

#### Goal

An owner can **create a plan, stock it meaningfully, and keep it current over time without inviting anyone**. The gap is maintenance, not motivation — every step of the personal loop should be guided and as simple as possible (including phone-first / camera-assisted where shopping and logging are hard).

#### The maintenance loop (guide each phase)

| Phase | Owner job today (pain) | Direction |
|-------|------------------------|-----------|
| **1. See** | What’s wrong / missing? Scattered across Dashboard, Plan, Expiring, alerts | One calm “what to do next” for the owner |
| **2. Plan the trip** | Turn gaps into a list | Solo restock / shopping list from plan gaps (no shopper role required) |
| **3. Shop** | Paper list or memory at the store | Phone as the list — large tap targets, offline-friendly if needed later |
| **4. Log / put away** | Manual inventory CRUD after shopping | Fast intake for the owner; explore **camera / barcode / photo** to add or update items |
| **5. Stay current** | Expiring + gaps return; easy to abandon | Nudges + shortest path back into the loop |

Ship guidance **per phase** — fewer decisions, clearer next action, mobile-first where the owner is standing in an aisle or pantry.

#### In scope (v1)

- Owner-only maintenance UX (assume single user on their plan)
- Guided next-step experience through the loop above
- Solo restock / shopping list flow (reuse or simplify Restock without requiring helpers)
- Mobile shopping list experience
- Faster logging after shopping (forms + explore camera/scan assist)
- Progressive disclosure: hide or de-emphasize multi-role complexity for new/solo owners
- Tighten dashboard / alerts so “See” answers “what do I do this week?”

#### Out of scope (v1)

- Exposing all four roles early in onboarding or Settings as a primary path
- Multi-role Restock handoffs (shopper → keeper → owner review)
- Phase C owner reconcile (accept / send back / accept inventory)
- Watcher suggestions, activity feed, household switcher chrome
- Full PWA / offline (nice-to-have follow-on; may spike for shopping list)
- Marketing landing plan-picker showcase
- Pets, scenarios/containers, starter templates (stay in Later)

#### First tickets

1. [x] **Define the solo loop UX** — Map + decision: [DECISIONS — Solo loop UX map](./DECISIONS.md#solo-loop-ux-map-ticket-1). **Dashboard** = See / next action; **Restock** = execution (plan trip → shop → log). No new Maintain page for v1.
2. [x] **Solo restock path** — Owner creates list from gaps → marks bought / done → **updates inventory** via `complete_solo_restock_run` (slice 1 RPC + slice 2 Restock UI). Multi-role handoff copy remains for helpers.
3. [x] **Mobile shopping list** — Restock offers Plan Gap, Supplementary, or combined lists; supplementary items support category / qty / unit / notes. Phone-as-list while `shopping`: large check-off, qty steppers, progress, sticky Done; validated purchases flow into Inventory. Completed lists link to a detail page.
4. **Fast put-away / log** — After shopping, shortest path to update inventory from the list; research spike: camera or barcode to create/update items (prototype one assist, not a full scanner product).
5. **De-emphasize roles UI** — Settings/sharing and Restock copy: don’t lead with four roles; “Add help later” / advanced for helpers.
6. [x] **Owner “See” pass** — Dashboard **This week** card via `computeOwnerNextAction` (restock → gaps → expired → expiring → empty → on target); plan-gap alerts link to Restock; Plan page **Restock from gaps** CTA.

#### After Solo owner v1 tickets 3–6 (not before)

7. **Category accordion inventory** — Expand each of the 7 coverage categories (Water → Documents) in place: status in a sticky header, list items under it, add/remove without the slideover as the default path. Collapse to scan the next category. Addresses bouncing Plan ↔ Inventory to see “what’s still left.” **Do not start until tickets 3–6 are done.**

---

## Next

_Solo owner v1 — remaining: **4** (fast put-away), **5** (de-emphasize roles). Ticket **7** (category accordion) waits until those ship._

---

## Later / advanced

Multi-role coordination is **shipped but not the product priority**. Resume when solo maintenance is solid; see `docs/TestAll4Roles.md` (shelved).

### Household coordination (advanced)

- [ ] **Phase C:** owner reconcile UI (accept / send back / accept inventory)
- [ ] Progressive invite prompts (“Someone else shops?”) only after solo loop works
- [ ] Defer “expose all roles early” — role picker / four-role onboarding stays advanced, not default
- [ ] Watcher suggestions, activity feed
- [ ] Full multi-role Restock polish as the primary nav story

### Other Later

- [ ] **Category accordion inventory** — see Solo ticket **7** above; promote only after tickets 3–6 ship
- [ ] **Phase guide toons (after Solo owner v1 loop UX)** — optional cell-shaded character behind each maintenance phase (See / Plan trip / Shop / Log·put away / Stay current); quiet atmosphere, not competing CTAs. Style via gear / avatar settings (none vs illustrated; later variants). **Do not** infer gender from name.
- [ ] **Internal admin / support tools** — view users & households, revoke memberships, resend/cancel invites, delete test accounts; admin-only auth
- [ ] **Landing page plan-picker showcase** — marketing (mock or sanitized demo)
- [ ] **Custom favicon** — BeReady SOS / shield-check branding
- [ ] **Add pets to household** — water/food planning
- [ ] **Scenarios & containers** — shelter vs mobile; “what items are where?” (see `DECISIONS.md`)
- [ ] **Invite email delivery** — Resend instead of copy/paste only
- [ ] Starter templates (72-hour kit, earthquake, winter storm)
- [ ] CSV import / export shopping list
- [ ] Consumption log (decrement qty when used)
- [ ] Push / email expiration reminders (Edge Functions + cron)
- [ ] PWA / offline (especially shopping list)
- [ ] Custom domain polish (nav still says “SOS Planner”)
- [ ] Camera / barcode grocery logging beyond the v1 spike

---

## How to use this file

1. Move items from **Next** → **Done** when shipped (check the box).
2. Add new ideas under **Later**; promote to **Next** when ready to build.
3. Keep **In progress** to one small slice at a time.
4. For the next session: open with “Solo owner v1” + this section + `DECISIONS.md` solo-owner decision.
