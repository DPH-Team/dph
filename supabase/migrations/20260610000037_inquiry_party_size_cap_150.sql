-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0037: lower party_size check constraint upper bound from 200 to 150
-- (150 = restaurant max capacity)
-- Table: public.inquiries
-- Constraint: inquiries_party_size_check
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.inquiries
  drop constraint if exists inquiries_party_size_check;

alter table public.inquiries
  add constraint inquiries_party_size_check
    check (party_size is null or (party_size >= 1 and party_size <= 150));
