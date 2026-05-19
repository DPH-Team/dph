import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import type { UserProfile } from '@/lib/auth';

interface AdminShellProps {
  profile: UserProfile;
  children: React.ReactNode;
}

/**
 * AdminShell — two-column layout: fixed sidebar (lg+) + scrollable main.
 *
 * Sidebar is hidden on mobile; AdminTopbar includes a sheet trigger for
 * narrow viewports.
 */
export function AdminShell({ profile, children }: AdminShellProps) {
  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {/* Desktop sidebar — fixed width, full height */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:shrink-0 border-r border-border">
        <AdminSidebar role={profile.role} />
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopbar profile={profile} />
        <main
          id="admin-main"
          className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
