'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { RoleBadge } from './RoleBadge';
import { AdminMobileSheet } from './AdminMobileSheet';
import type { UserProfile } from '@/lib/auth';

interface AdminTopbarProps {
  profile: UserProfile;
}

/** Converts a URL segment like "activity-log" to "Activity Log". */
function formatSegment(segment: string): string {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function Breadcrumbs() {
  const pathname = usePathname();

  // Strip leading slash and split
  const segments = pathname.replace(/^\//, '').split('/');

  // Always starts with "Admin"
  const crumbs: Array<{ label: string; href: string }> = [
    { label: 'Admin', href: '/admin' },
  ];

  // Build up the rest: /admin/events/123 → ["events", "123"]
  let accumulated = '/admin';
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg) continue;
    accumulated += `/${seg}`;
    crumbs.push({ label: formatSegment(seg), href: accumulated });
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 min-w-0">
      <ol className="flex items-center gap-1 flex-wrap">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1">
              {idx > 0 && (
                <ChevronRight
                  className="size-3.5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
              )}
              {isLast ? (
                <span
                  className="text-sm font-medium text-foreground truncate"
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : (
                <a
                  href={crumb.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  {crumb.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function AdminTopbar({ profile }: AdminTopbarProps) {
  const displayName = profile.full_name || profile.email;

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 lg:px-6 backdrop-blur-sm sticky top-0 z-10">
      {/* Mobile menu toggle — visible only below lg */}
      <div className="lg:hidden">
        <AdminMobileSheet role={profile.role} />
      </div>

      {/* Breadcrumbs */}
      <div className="flex-1 min-w-0">
        <Breadcrumbs />
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="gap-2 max-w-[200px]" />
          }
        >
          <span className="truncate text-sm font-medium">{displayName}</span>
          <RoleBadge role={profile.role} />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium leading-none truncate">
                  {profile.full_name ?? 'No name set'}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {profile.email}
                </span>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />

          {/* Sign out via form POST to /logout — never call signOut() client-side */}
          <DropdownMenuItem
            render={
              <form method="post" action="/logout" className="w-full" />
            }
          >
            <button
              type="submit"
              className="w-full text-left text-sm cursor-default"
            >
              Sign out
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
