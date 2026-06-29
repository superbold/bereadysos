-- Household coordination — step 1 of 2: new member_role enum values.
-- PostgreSQL requires enum additions to commit before use.
-- Run this file first, then 20260625160100_household_coordination.sql.

alter type public.member_role add value if not exists 'maintainer';
alter type public.member_role add value if not exists 'shopper';
alter type public.member_role add value if not exists 'watcher';
