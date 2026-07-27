-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0036: Reset Instagram config for Graph API migration
--
-- The previous integration stored Behold.so config in the `config` jsonb column
-- (e.g. {"feed_id": "..."}). With the switch to Meta Graph API, the `config`
-- column holds token metadata: { token_obtained_at, token_expires_at }.
--
-- This migration clears the stale Behold config so there is no residual feed_id
-- key. The access_token is stored in the encrypted `credentials` column (written
-- via the set_integration_credentials RPC) — no SQL migration can or should
-- touch that value.
--
-- No schema change — only a one-row data hygiene update.
-- ─────────────────────────────────────────────────────────────────────────────

update public.integrations
set config = '{}'::jsonb
where name = 'instagram';
