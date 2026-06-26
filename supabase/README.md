# Supabase — database

Phase 1 schema: `households`, `household_members`, `categories`, `items` with RLS.

## Apply the migration

### Option A — Supabase Dashboard (no CLI)

1. Open your project → **SQL Editor**
2. Paste the contents of `migrations/20260623120000_initial_schema.sql`
3. Run

### Option B — Supabase CLI

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Verify

In **Table Editor**, you should see:

| Table | Notes |
|-------|--------|
| `categories` | 7 seeded rows (water, food, medical, …) |
| `households` | Created when a user first visits the app (Phase 2) |
| `household_members` | Links `auth.users` → household |
| `items` | Household inventory (Phase 3 UI at `/inventory`) |

### Phase 2 migration (one household per user)

Run `migrations/20260623130000_household_one_per_user.sql` in SQL Editor to enforce one household per user (unique index on `household_members.user_id`). Required for production; check for duplicate memberships before applying.

### Household bootstrap fix (required for Settings)

Run `migrations/20260623140000_bootstrap_household_rpc.sql` — adds `bootstrap_household()` RPC so creating a household does not hit RLS chicken-and-egg on first sign-in.

RLS is enabled on all four tables. `categories` is read-only for signed-in users.

## Regenerate TypeScript types

After schema changes, refresh types (requires [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
pnpm db:types
```

Or manually keep `app/types/database.types.ts` in sync with migrations.

## Schema overview

```
households
├── headcount, target_days, name
└── household_members (user_id, role: owner|member)
    └── items → categories
```

**Consumable categories** (water, food): days-of-supply math via `default_daily_per_person`.  
**Checklist categories** (medical, hygiene, …): have / need via `recommended_qty`.

See `docs/DECISIONS.md` for product context.
