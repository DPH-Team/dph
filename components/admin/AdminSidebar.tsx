import { Wordmark } from '@/components/marketing/Wordmark';
import { Separator } from '@/components/ui/separator';
import { NavLink } from './NavLink';
import { adminNav } from './nav';
import type { AppRole } from '@/lib/auth';

interface AdminSidebarProps {
  role: AppRole;
  onNavClick?: () => void;
}

export function AdminSidebar({ role, onNavClick }: AdminSidebarProps) {
  const visibleNav = adminNav.filter(
    (item) => !item.adminOnly || role === 'admin',
  );

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Wordmark */}
      <div className="flex h-14 items-center px-4">
        <Wordmark size="sm" asLink={false} />
      </div>

      <Separator />

      {/* Nav */}
      <nav
        aria-label="Admin sections"
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        <ul role="list" className="flex flex-col gap-0.5">
          {visibleNav.map((item) => (
            <li key={item.href}>
              <NavLink item={item} onClick={onNavClick} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer note */}
      <div className="px-4 py-3">
        <p className="text-[11px] text-muted-foreground/60 leading-tight">
          District Pour Haus
          <br />
          Admin Portal
        </p>
      </div>
    </div>
  );
}
