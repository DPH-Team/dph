-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0031: restrict audit_log SELECT to admins only
-- Staff users no longer have access to the Activity Log; only admins may query
-- audit_log rows. Write access remains service-role-only (unchanged).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── RLS policies: audit_log ─────────────────────────────────────────────────

drop policy if exists "audit_log_select_staff" on public.audit_log;

create policy "audit_log_select_admin"
  on public.audit_log
  for select
  using (public.is_admin());
