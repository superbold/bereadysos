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
| Plan gap / shortfall | User-facing terms for inventory below the chosen plan | Plan page, badges, auth hero |
| Headcount | Single number per household | Named members later if needed |
| Product priority | **Solo owner maintenance first** | Multi-role coordination is real but progressive — see below |

### Solo owner first (priority)

**Decision (2026-07-14):** Prioritize making the **plan owner** succeed alone — finish a plan and keep it maintained — before pushing multi-role household coordination as a primary path.

**Why:**
- The main gap is not motivation; it is **maintenance**. If an owner cannot keep inventory current with little friction, they will not finish or sustain a plan.
- Owners who cannot maintain a plan will not invite helpers. Recruiting shoppers, inventory keepers, or watchers does not fix an empty or stale inventory loop.
- Exposing all four roles (owner, inventory keeper, shopper, watcher) at once adds coordination responsibility before the owner has a durable personal workflow. That is the wrong order for most new users.

**What this means:**
- Product focus: one role, one loop — the owner sees what is wrong, fixes it in few steps, and knows the plan is current (gaps, expiring, restock-as-personal checklist, put-away).
- Multi-role Restock (Phases A–C), plan picker for helpers, and invite role pickers stay in the product for households that already need them (e.g. testing, later maturity). They are **delegation of a working maintenance loop**, not the first-run tour.
- UI should introduce helpers **progressively** when a clear pain appears (e.g. “someone else shops”), not front-load a four-role model on day one.
- Do not remove shipped coordination capabilities; de-emphasize them until solo owner maintenance is strong.

**Success signal for this direction:** An owner can create a plan, stock it meaningfully, and keep it updated over time without inviting anyone.

### Solo loop UX map (ticket 1)

**Decision (2026-07-14):** Primary “what do I do next?” surface is the **Dashboard** (`/`). **Restock** (`/restock`) is the **execution path** for plan trip → shop → log (tickets 2–4). Do **not** add a new Maintain page for v1 unless Dashboard + Restock stay cluttered after those passes.

**Why Dashboard for See (phase 1):**
- Owners already land on `/`; coverage, expiration, and (when mid-run) coordination banner already live there or in the shell AlertsBell.
- Restock today is a multi-role state machine — wrong default landing when the owner has gaps but no run.
- Stay-current nudges (phase 5) and ticket 6 belong on a home narrative with **one** primary CTA into Restock or Expiring/Inventory as needed.

**Screen → phase map (today → direction):**

| Phase | Today (scattered) | Solo direction |
|-------|-------------------|----------------|
| **1. See** | Dashboard coverage; Plan gaps; Expiring; AlertsBell → those pages | Dashboard owns one calm “this week / do this next” card; AlertsBell stays inbox, ranked toward that next action |
| **2. Plan the trip** | Restock: owner can create run from gaps; Plan has **no** CTA to Restock; helper copy (“Send to shopper”) | Solo list-from-gaps on Restock; Plan (and See CTA) deep-link into that path |
| **3. Shop** | Restock `shopping` status: read-only list + mark complete | Phone-as-list on Restock (check-off / qty); solo labels (not shopper handoff) |
| **4. Log / put away** | Restock intake (doesn’t write inventory) + manual `/inventory` CRUD | Solo put-away that **updates inventory** from the list (v1 may simplify statuses; multi-role Phase C stays Later) |
| **5. Stay current** | Alerts + reappearing gaps/expiring; no weekly narrative | Dashboard + alerts nudge back into See → Restock |

**Rejected for v1 primary surface:** Guided Restock-as-home (helper status chrome, poor “all clear”); new Maintain route (extra nav until proven necessary).

**Build order implied:** Ticket 6 (See on Dashboard) + ticket 2 (solo Restock) can proceed from this map; Prefer Dashboard CTA shaping in ticket 6, solo path simplification in ticket 2 (they can interleave).

**Category accordion inventory (after Solo tickets 3–6):** Rebuild Inventory around expandable coverage categories (sticky status header, inline add/remove, no slideover-by-default). Validated by solo restock testing — owners otherwise bounce Plan ↔ Inventory to see what’s left. **Do not start before** mobile list, put-away, roles de-emphasis, and Dashboard See are done.

### Phase guide toons (polish, after solo loop)

**Decision (2026-07-14):** Optional cell-shaded characters behind maintenance phases are a **Later** flourish — after Solo owner v1 loop UX exists. Preference lives in **gear / avatar settings** (e.g. none vs illustrated). **Do not** infer gender or style from the owner’s name.

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

### Household invites

**Status:** Shipped. Copy-link invites (email delivery later). Owner manages sharing in Settings.

**Flow:**
1. Owner enters guest email → **Create invite link** (copied to clipboard)
2. Guest opens `/invite/accept?token=…` → signs in with that email → **Accept invite**
3. Guest becomes `member`; header shows owner’s “{name}'s plan”
4. Owner can **Cancel** pending invites or **Remove** guests

**Rules:**
- One owned household per user
- One inventory-keeper or shopper slot on another plan; one watcher slot on another plan
- Maintainer/shopper accept: empty owned household removed; users with inventory must use **Watcher** invite
- Inventory keeper can edit inventory; shopper/watcher read-only; only owner changes targets and sharing

### Household coordination (Restock)

**Status:** Phases A–B shipped; Phase C later. Product priority is now **solo owner first** (see above) — multi-role coordination is an advanced / progressive path, not the default onboarding focus.

Internal name: **household coordination**; user-facing nav: **Restock**.

| DB role | UI label | Inventory |
|---------|----------|-----------|
| `owner` | Plan owner | CRUD + settings |
| `maintainer` | Inventory keeper | CRUD |
| `shopper` | Shopper | Read-only |
| `watcher` | Watcher | Read-only (keeps own plan) |

**Phase A:** Owner creates restock run from plan gaps → sends to shopper → shopper marks complete → awaiting intake banner.

**Plan picker (shipped):** After login, `/plan-picker` lists every membership (owned + helping) with role copy, alert previews, and plan tint. One plan auto-opens the dashboard; multiple plans require a choice. Header brand links back to switch plans.

**Phase B (shipped):** After shopping completes, the inventory keeper starts intake, logs each line (bought / substituted / skipped + quantity + note), and submits for owner review. Inventory is **not** auto-updated — Phase C accepts into inventory.

**Phase C (later):** Owner reconcile split view — **Accept** / **Send back** / **Accept inventory**.

**Not yet:** Watcher suggestions, household switcher, activity feed. Test plan for multi-role: `docs/TestAll4Roles.md` (shelved).

---

### Global alerts panel

**Status:** Shipped. Auth hero stays motivational only — no real preparedness warnings before sign-in.

**Goal:** One calm, actionable inbox for signed-in users — aggregate what already exists on Dashboard, Plan, and Expiring without duplicating fear on the landing page.

**Display:** Header **bell** with **numeric badge** (no sheen animation). Click opens a **slideover** (not a modal or auto-popup). Rows grouped by family; each row links to `/expiring`, `/plan`, or `/`.

**Warning design (3 properties, like a stop sign):**

| Property | Implementation |
|----------|----------------|
| **Shape** | Lucide icon in a rounded square per alert |
| **Color** | `error` (red) or `warning` (amber) — badge uses worst severity present |
| **Text** | `title` + `detail` on each row |

**What to aggregate (3 families):**

| Family | Source (existing) | Example copy |
|--------|-------------------|--------------|
| **Expiration** | `countExpired`, `countExpiringSoon`, `listExpiringItems` in `shared/coverage.ts` | “2 expired · 3 expiring within 30 days” |
| **Plan gaps** | `computeAllCategoryGaps` → open gaps, `formatGapLabel` | “Water: shortfall +2 gallons” |
| **Coverage** | `coverageStatus` on dashboard cards | “Medical: needs attention” — only when it adds signal beyond plan gaps (e.g. checklist categories) |

**Severity (reuse today’s tokens):**

| Level | When |
|-------|------|
| `error` | Expired items; critical coverage (&lt;50%); consumable plan gap with zero on hand |
| `warning` | Expiring within 30 days; low coverage (50–99%); plan gap shortfall with some stock |

**Out of scope for this panel:**

- System/load errors (`UAlert` on pages) — stay page-local
- Auth hero demo warnings — illustrative only; do **not** wire to real alert types (avoid fear before signup)

**Tone:** Factual and actionable (“Review 2 expired items”), not alarmist. Same red/amber semantics as today, softer framing.

**Proposed architecture:**

1. **`shared/alerts.ts`** — `computeAlerts()` → `AppAlert[]` with `kind`, `severity`, `icon`, `title`, `detail`, `href`
2. **`useAlerts()`** — composable on `useHousehold` + `useInventory`
3. **`AlertsBell.vue`** — bell + badge + slideover in `default.vue` layout

**Suggested build order:** _(done)_

See also **Later** in `docs/BACKLOG.md`.

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

Branded HTML: paste from `supabase/email-templates/confirm-signup.html` (Authentication → Emails → Confirm signup → Source).

Minimal link-only fallback:

```html
<a href="{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=email">
  Confirm your email
</a>
```

### Supabase email template (Reset password)

Branded HTML: paste from `supabase/email-templates/reset-password.html` (Authentication → Emails → Reset password → Source).

Minimal link-only fallback:

```html
<a href="{{ .SiteURL }}/api/auth/recover?token_hash={{ .TokenHash }}&type=recovery">
  Reset your password
</a>
```

**Redirect URLs** (Authentication → URL Configuration): add `/confirm`, `/auth/reset-password`, and `/api/auth/recover` for production and localhost.

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
| Water bottles | Bottles × fl oz → gallons | No new columns — `quantity` = bottle count, `unit` = `bottles`, `volume_per_unit` = gallons/bottle (`oz / 128`). UX presets 12 / 16.9 / 20 oz; juxtapose FEMA ~1 gal/person/day. Helpers in `shared/water-volume.ts`. |
| Profiles table | `profiles.first_name` | Shown in header as “{name}'s plan”; signup + settings |
| Migrations | See list below | Applied in Supabase SQL Editor |

### Migrations (in order)

| File | Purpose |
|------|---------|
| `20260623120000_initial_schema.sql` | Tables, RLS, category seed |
| `20260623130000_household_one_per_user.sql` | Optional unique index on `household_members.user_id` |
| `20260623140000_bootstrap_household_rpc.sql` | `bootstrap_household()` function |
| `20260625120000_profiles.sql` | `profiles`, `ensure_profile()` |
| `20260625140000_household_invites.sql` | Invites, guest membership, sharing RPCs |
| `20260625160000_household_coordination_enum.sql` | `member_role` enum: maintainer, shopper, watcher (run alone first) |
| `20260625160100_household_coordination.sql` | Roles migration, shop runs, Restock |
| `20260707120000_shop_run_intake.sql` | Intake RPCs, `intake_submitted_at` |
| `20260717120000_solo_restock_complete.sql` | `complete_solo_restock_run` — apply intake to inventory, close run |

### Tables

| Table | Purpose |
|-------|---------|
| `households` | `name`, `headcount`, `target_days` |
| `household_members` | `user_id`, `role` (`owner` \| `maintainer` \| `shopper` \| `watcher`; legacy `member`) |
| `profiles` | `user_id`, `first_name` — peers in same household can read (for invites) |
| `categories` | Seeded; `slug`, `calc_type`, defaults for days math |
| `items` | Inventory lines; optional `location` (containers later) |
| `shop_runs` / `shop_run_lines` | Restock workflow — shopping list + status |

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
| 2026-06 | Phase 5: `/plan` — gap list, `computeAllCategoryGaps`, `PlanGapCard` |
| 2026-06 | Global alerts panel shipped — bell + badge + slideover; `shared/alerts.ts`, `useAlerts`, `AlertsBell.vue` |
| 2026-06 | Household invites — Settings sharing section, accept page, guest `member` role |
| 2026-06 | Household coordination Phase A — Restock nav, roles (inventory keeper / shopper / watcher), shop runs |
| 2026-07 | Solo owner first — prioritize owner maintenance UX; multi-role coordination progressive / advanced, not day-one focus |
| 2026-07 | Solo loop UX — Dashboard = See / next action; Restock = plan trip → shop → log execution; no new Maintain page for v1 |
| 2026-07 | Phase guide toons — optional, gear/avatar setting; never infer style from name; after solo loop UX |
| 2026-07 | Water bottles — count × fl oz → gallons via existing `volume_per_unit`; FEMA juxtapose in inventory form |
| 2026-07 | Category accordion inventory — after Solo tickets 3–6; sticky category status + inline items (no Plan bounce) |
| 2026-07 | Owner See pass — Dashboard “This week” next action; plan gaps CTA to Restock |
