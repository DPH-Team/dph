'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from './nav';

interface NavLinkProps {
  item: NavItem;
  onClick?: () => void;
}

export function NavLink({ item, onClick }: NavLinkProps) {
  const pathname = usePathname();

  // Exact match for dashboard, prefix match for everything else
  const isActive =
    item.href === '/admin'
      ? pathname === '/admin'
      : pathname === item.href || pathname.startsWith(item.href + '/');

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card',
        isActive
          ? 'bg-[oklch(0.235_0.004_286)] text-foreground'
          : 'text-muted-foreground hover:bg-[oklch(0.235_0.004_286)] hover:text-foreground',
      )}
    >
      <Icon
        className={cn(
          'size-4 shrink-0 transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
        )}
        aria-hidden="true"
      />
      <span>{item.label}</span>
    </Link>
  );
}
