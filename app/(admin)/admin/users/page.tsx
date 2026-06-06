import Link from 'next/link';
import { Users, Search, Plus } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { listUsers, computeUserCounts } from '@/lib/db/queries/users';
import { listUsersFilterSchema } from '@/lib/validators/users';
import { UsersTable } from './UsersTable';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  // Defense-in-depth: layout already calls requireAdmin but we call it here too.
  const profile = await requireAdmin();

  const rawParams = await searchParams;
  const rawFilter = {
    role: typeof rawParams.role === 'string' ? rawParams.role : undefined,
    status: typeof rawParams.status === 'string' ? rawParams.status : undefined,
    search: typeof rawParams.q === 'string' ? rawParams.q : undefined,
  };

  const parsed = listUsersFilterSchema.safeParse(rawFilter);
  const filter = parsed.success ? parsed.data : {};

  const allUsers = await listUsers(profile.id);

  // Apply filters client-side (small list — no DB round-trip needed).
  const filtered = allUsers.filter((u) => {
    if (filter.status && filter.status !== 'all') {
      if (u.status !== filter.status) return false;
    }
    if (filter.role && filter.role !== 'all') {
      if (u.role !== filter.role) return false;
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const matchesEmail = u.email.toLowerCase().includes(q);
      const matchesName = (u.fullName ?? '').toLowerCase().includes(q);
      if (!matchesEmail && !matchesName) return false;
    }
    return true;
  });

  const counts = computeUserCounts(allUsers);
  const hasFilters = Boolean(
    (filter.status && filter.status !== 'all') ||
      (filter.role && filter.role !== 'all') ||
      (filter.search && filter.search !== ''),
  );

  const activeRole = filter.role ?? 'all';
  const activeStatus = filter.status ?? 'all';
  const activeSearch = filter.search ?? '';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="size-5 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-foreground">Users</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage staff accounts, assign roles, and deactivate access when
            someone leaves the team.
          </p>
        </div>

        {/* Count pills + new user button */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full border border-[#C97B4A]/30 bg-[#C97B4A]/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-[#C97B4A]">
            {counts.admins} {counts.admins === 1 ? 'admin' : 'admins'}
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-[oklch(0.235_0.004_286)] px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
            {counts.staff} staff
          </span>
          {counts.disabled > 0 && (
            <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-destructive">
              {counts.disabled} disabled
            </span>
          )}

          <Link
            href="/admin/users/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-[oklch(0.610_0.128_46)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            New user
          </Link>
        </div>
      </header>

      {/* Filter row — plain GET form, no JS required */}
      <form
        method="GET"
        action="/admin/users"
        className="flex flex-wrap items-end gap-3"
      >
        {/* Role filter */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-role"
            className="text-xs text-muted-foreground font-medium uppercase tracking-wide"
          >
            Role
          </label>
          <select
            id="filter-role"
            name="role"
            defaultValue={activeRole}
            className="h-9 rounded-[var(--radius-md)] border border-border bg-input px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>
        </div>

        {/* Status filter */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-status"
            className="text-xs text-muted-foreground font-medium uppercase tracking-wide"
          >
            Status
          </label>
          <select
            id="filter-status"
            name="status"
            defaultValue={activeStatus}
            className="h-9 rounded-[var(--radius-md)] border border-border bg-input px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        {/* Name / email search */}
        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label
            htmlFor="filter-search"
            className="text-xs text-muted-foreground font-medium uppercase tracking-wide"
          >
            Search
          </label>
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="filter-search"
              name="q"
              type="search"
              defaultValue={activeSearch}
              placeholder="Name or email…"
              className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-input pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            />
          </div>
        </div>

        <button
          type="submit"
          className="h-9 rounded-[var(--radius-md)] border border-border bg-[oklch(0.235_0.004_286)] px-4 text-sm font-medium text-foreground transition-colors hover:bg-[oklch(0.270_0.004_286)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
        >
          Filter
        </button>

        {hasFilters && (
          <Link
            href="/admin/users"
            className="h-9 inline-flex items-center rounded-[var(--radius-md)] px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Users table */}
      <UsersTable users={filtered} hasFilters={hasFilters} currentUserId={profile.id} />
    </div>
  );
}
