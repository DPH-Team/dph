-- Migration: subscribers_double_optin
-- Phase 7 — double opt-in newsletter.
--
-- Adds three columns to support the pending / confirmed / unsubscribed state
-- machine:
--   confirmed_at      — null = pending; set to now() when the user clicks the
--                       confirmation link.
--   confirm_token     — uuid sent in the confirmation email; nulled after
--                       confirm or unsubscribe. Nullable because it is cleared
--                       once used.
--   unsubscribe_token — permanent per-row uuid used in every unsubscribe link.
--                       Generated once at insert time, never changes.
--
-- RLS note: NO new RLS policies are added here.
--   • Confirm/unsubscribe state mutations run through the non-RLS Drizzle `db`
--     client (DATABASE_URL / postgres role), so anon UPDATE policies are not
--     required and must NOT be added — they would allow arbitrary email-state
--     manipulation via the client.
--   • The existing anon INSERT policy remains valid: new rows land in the
--     pending state (confirmed_at null, unsubscribed_at null).
--   • Admin mutations (markSubscriberUnsubscribed, resubscribeSubscriber) run
--     server-side under the service role and are guarded by requireAdmin().

alter table public.subscribers
  add column confirmed_at      timestamptz,
  add column confirm_token     uuid,
  add column unsubscribe_token uuid not null default gen_random_uuid();

-- Backfill: existing rows were written before double opt-in existed.
-- Grandfather them in as confirmed so the new active-definition
-- (confirmed_at IS NOT NULL AND unsubscribed_at IS NULL) does not silently
-- drop them from admin views and broadcast exports.
-- Re-confirming legacy subscribers is a business decision for the owner —
-- this migration does NOT send any emails or flag them for re-confirmation.
update public.subscribers
  set confirmed_at = coalesce(confirmed_at, subscribed_at)
  where unsubscribed_at is null;

-- Token indexes
create index subscribers_confirm_token_idx
  on public.subscribers (confirm_token) where confirm_token is not null;

create index subscribers_unsubscribe_token_idx
  on public.subscribers (unsubscribe_token);

-- Replace the active-subscriber index: old predicate was `unsubscribed_at is null`;
-- new predicate adds `confirmed_at is not null` so pending rows are excluded.
drop index if exists public.subscribers_active_idx;
create index subscribers_active_idx
  on public.subscribers (subscribed_at desc nulls last)
  where confirmed_at is not null and unsubscribed_at is null;
