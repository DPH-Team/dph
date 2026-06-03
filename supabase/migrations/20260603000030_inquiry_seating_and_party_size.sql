-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0030: add seating_preference enum + column to inquiries; raise
-- party_size check constraint upper bound from 50 to 200.
-- Table: public.inquiries
-- New type: public.seating_preference  (high_top | low_top | either)
-- ─────────────────────────────────────────────────────────────────────────────

-- Create the enum type (idempotent guard via DO block)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'seating_preference') then
    create type seating_preference as enum ('high_top', 'low_top', 'either');
  end if;
end
$$;

-- Add nullable seating_preference column to inquiries
alter table public.inquiries
  add column if not exists seating_preference seating_preference;

-- Drop and recreate the party_size check to allow up to 200
alter table public.inquiries
  drop constraint if exists inquiries_party_size_check;

alter table public.inquiries
  add constraint inquiries_party_size_check
    check (party_size is null or (party_size >= 1 and party_size <= 200));
