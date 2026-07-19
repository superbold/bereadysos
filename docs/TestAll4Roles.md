# Test plan — all four household roles

**Status:** Shelved — run manually when ready to verify household coordination (Phase A + Phase B).

Covers **owner**, **inventory keeper**, **shopper**, and **watcher** on a shared plan, including Restock through intake submit. Phase C (owner accept / send back / apply to inventory) is not in scope yet.

---

## Prerequisites

- [ ] Migrations applied in Supabase (in order):
  1. `20260625160000_household_coordination_enum.sql`
  2. `20260625160100_household_coordination.sql`
  3. `20260707120000_shop_run_intake.sql`
- [ ] Latest `main` deployed on Vercel (`bereadysos.com`)
- [ ] Owner household has **open plan gaps** (Plan page) so **Restock from plan gaps** produces items — or use **Supplementary Shopping** for a minimal path
- [ ] Four test accounts (separate emails) or three helpers + one owner

**Verify migrations (SQL Editor):**

```sql
select
  exists (select 1 from information_schema.tables where table_name = 'shop_runs') as shop_runs,
  exists (select 1 from information_schema.columns where table_name = 'shop_runs' and column_name = 'intake_submitted_at') as intake_column,
  exists (select 1 from information_schema.routines where routine_name = 'start_shop_run_intake') as intake_rpc;
```

All three should be `true`.

---

## Role reference

| DB role | UI label | Inventory | Settings / sharing | Restock |
|---------|----------|-----------|-------------------|---------|
| `owner` | Plan owner | CRUD | Full (targets, invites) | Create run, send to shopper, see submitted intake |
| `maintainer` | Inventory keeper | CRUD | Profile only | Start intake, log lines, submit for review |
| `shopper` | Shopper | Read-only | Profile only | View list, mark shopping complete |
| `watcher` | Watcher | Read-only | Profile only | Read-only; no intake edits |

**Watcher copy (canonical):** Read-only — watch the plan, offer suggestions, and see when the owner follows up — without editing inventory or settings.

---

## Setup — invites and plan context

Use **four browsers** or **incognito windows** (one session per user).

### 1. Owner creates the plan

1. Sign in as **owner** (e.g. Rose).
2. Confirm dashboard loads; note household name on **Settings**.
3. **Settings → Household sharing:** invite three emails with roles:
   - Inventory keeper (`maintainer`)
   - Shopper (`shopper`)
   - Watcher (`watcher`)
4. Copy invite links; each helper signs up or signs in and accepts.

### 2. Plan picker (helpers with multiple memberships)

1. Each helper signs in.
2. **Expect:** `/plan-picker` if they belong to 2+ plans; otherwise dashboard.
3. Select the **owner’s plan**; header shows plan label and **· switch** when multiple plans exist.

### 3. Settings role banner

Each role opens **Settings** on the shared plan:

- [ ] Owner — no “you are the …” restriction; household fields editable
- [ ] Inventory keeper — role banner; can edit **first name**; cannot change headcount/target days/sharing
- [ ] Shopper — role banner with shopper description
- [ ] Watcher — role banner with watcher description

---

## Restock workflow (Phase A → Phase B)

### Step 1 — Owner: draft and send

| # | Actor | Action | Expect |
|---|-------|--------|--------|
| 1 | Owner | **Restock** → **Restock from plan gaps** | Draft run with gap items |
| 2 | Owner | **Send to shopper** | Status: **Shopping in progress** |
| 3 | Owner | Try second run while one is active | Disabled / “Finish the current run…” |

### Step 2 — Shopper: complete shopping

| # | Actor | Action | Expect |
|---|-------|--------|--------|
| 4 | Shopper | **Restock** → view list | List visible; read-only on inventory elsewhere |
| 5 | Shopper | Add optional note → **Mark shopping complete** | Toast success; **Shopping complete — ready for intake** |
| 6 | Shopper | **Inventory** | Cannot add/edit/delete items |

### Step 3 — Dashboard banners

| # | Actor | Page | Expect |
|---|-------|------|--------|
| 7 | Inventory keeper | Dashboard | Banner: shopping complete — log intake; **Open Restock** |
| 8 | Owner | Dashboard | Banner: awaiting intake (or similar) |
| 9 | Watcher | Dashboard | Banner if shown; no intake actions |

### Step 4 — Inventory keeper: intake (Phase B)

| # | Actor | Action | Expect |
|---|-------|--------|--------|
| 10 | Keeper | **Restock** → **Start intake** | **Log intake** section per line |
| 11 | Keeper | Each line: status + qty + note → **Save line** | Toast; **Saved** on row |
| 12 | Keeper | **Submit for owner review** before all lines saved | Disabled |
| 13 | Keeper | Submit after all lines saved | **Intake submitted**; read-only summary |
| 14 | Keeper | **Inventory** | Quantities **unchanged** (Phase C applies stock) |

**Line status checks:**

- [ ] Bought / Substituted — quantity required
- [ ] Skipped — quantity optional (0)
- [ ] Shopper note visible during intake

### Step 5 — Owner: after submit

| # | Actor | Action | Expect |
|---|-------|--------|--------|
| 15 | Owner | **Restock** | **Intake submitted** with logged lines |
| 16 | Owner | **All runs** | **Awaiting owner review** (not “Intake in progress”) |
| 17 | Owner | Dashboard | Banner: intake ready for review (Phase C UI not built yet) |

### Step 6 — Watcher during coordination

| # | Actor | Action | Expect |
|---|-------|--------|--------|
| 18 | Watcher | **Restock** | Read-only alert; sees run status / lines where UI allows |
| 19 | Watcher | **Inventory** | Read-only |
| 20 | Watcher | **Settings** | No household/sharing edits |

---

## Per-surface permission matrix

Run once with a stable plan (no active restock run required).

| Surface | Owner | Inventory keeper | Shopper | Watcher |
|---------|-------|------------------|---------|---------|
| `/` Dashboard | Full | Full view | Full view | Full view |
| `/inventory` CRUD | Yes | Yes | No | No |
| `/plan` | View gaps | View | View | View |
| `/expiring` | View | View | View | View |
| `/settings` household | Edit | No | No | No |
| `/settings` sharing | Invite/revoke | No | No | No |
| `/restock` create run | Yes | No | No | No |
| `/restock` mark shopping complete | Yes* | No | Yes | No |
| `/restock` intake | Yes** | Yes | No | No |

\* Owner can complete shopping if no dedicated shopper is assigned.  
\** Owner has `can_edit_inventory` and can perform intake like the keeper.

---

## Plan picker cards

With owner + at least one helping role:

- [ ] Owner card: **Your plan**, primary tint
- [ ] Helping cards: role badge, role description, alert preview
- [ ] Activity line reflects restock state (shopping, intake pending, etc.)
- [ ] Selecting a card switches active household context (header plan label updates)

---

## Invite edge cases (optional)

- [ ] New user from invite lands on accept flow, not auto-bootstrapped into a stray owned household
- [ ] After accept, active plan is the invited household
- [ ] Login with `?redirect=/invite/accept?token=…` preserves return URL

---

## Quick pass/fail checklist

**Coordination**

- [ ] Draft → shopping → shopping complete → intake pending → intake submitted
- [ ] No RPC errors on **Start intake**, **Save line**, **Submit for owner review**
- [ ] Only one active coordination run at a time

**Roles**

- [ ] Shopper and watcher cannot edit inventory
- [ ] Only owner manages settings and sharing
- [ ] Keeper (or owner) can complete intake; shopper cannot

**Phase B invariant**

- [ ] Inventory **not** auto-updated after intake submit (until Phase C)

---

## When something fails

Record:

1. Step number and role
2. URL and page
3. Exact toast or browser console / network error
4. Run status in **All runs** on Restock

Common causes: migration not applied, wrong active plan (plan picker), or testing shopper intake (not allowed).

---

## Related docs

- [BACKLOG.md](./BACKLOG.md) — coordination phases
- [DECISIONS.md](./DECISIONS.md) — role rules and Restock workflow
- [supabase/README.md](../supabase/README.md) — migration order
