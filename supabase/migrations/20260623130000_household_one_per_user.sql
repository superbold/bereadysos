-- Phase 2: one household per user (MVP; invites may relax this later)
create unique index if not exists household_members_user_id_unique
  on public.household_members (user_id);
