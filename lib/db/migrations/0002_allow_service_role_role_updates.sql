-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0002: Allow service-role to update profiles.role
--
-- Problem: prevent_self_role_promotion (added in 0001) runs as SECURITY INVOKER.
-- When the service-role client issues an UPDATE, auth.uid() returns NULL because
-- there is no user session. public.is_admin() therefore returns false (it does
-- SELECT role FROM profiles WHERE id = NULL, which yields no rows → NULL, which
-- is not 'admin'). This means the trigger blocks legitimate role promotions
-- performed by trusted server-side tooling (seed scripts, migrations, admin
-- actions running under service-role).
--
-- Fix: add an early-return guard at the top of prevent_self_role_promotion:
-- if auth.uid() IS NULL we are running under the service-role (or a postgres
-- superuser), both of which are fully trusted at the connection level — RLS is
-- already bypassed for them. Allowing the update here does not weaken the
-- protection because an unauthenticated browser session cannot reach this path;
-- the service-role key is never sent to the client.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.prevent_self_role_promotion()
  returns trigger
  language plpgsql
  security invoker
  as $$
begin
  -- Service-role and superuser connections have no auth.uid() session.
  -- They bypass RLS entirely and are trusted at the connection level,
  -- so we permit role changes made from those contexts.
  if auth.uid() is null then
    return new;
  end if;

  if new.role <> old.role and not public.is_admin() then
    raise exception 'Only admins can change roles.' using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;
