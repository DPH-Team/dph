import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Calendar,
  UtensilsCrossed,
  Clock,
  FileText,
  Image,
  Inbox,
  Briefcase,
  Mail,
  ScrollText,
  Plug,
  Users,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const adminNav: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/admin/hours', label: 'Hours', icon: Clock },
  { href: '/admin/content', label: 'Content', icon: FileText },
  { href: '/admin/gallery', label: 'Gallery', icon: Image },
  { href: '/admin/inquiries', label: 'Inquiries', icon: Inbox },
  { href: '/admin/careers', label: 'Careers', icon: Briefcase },
  { href: '/admin/newsletter', label: 'Newsletter', icon: Mail, adminOnly: true },
  { href: '/admin/activity', label: 'Activity Log', icon: ScrollText },
  { href: '/admin/integrations', label: 'Integrations', icon: Plug, adminOnly: true },
  { href: '/admin/users', label: 'Users', icon: Users, adminOnly: true },
];
