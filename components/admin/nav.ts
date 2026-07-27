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
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export type IconKey =
  | 'dashboard'
  | 'calendar'
  | 'utensils'
  | 'clock'
  | 'file'
  | 'image'
  | 'inbox'
  | 'briefcase'
  | 'mail'
  | 'scroll'
  | 'plug'
  | 'users'
  | 'team';

export const NAV_ICONS: Record<IconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  calendar: Calendar,
  utensils: UtensilsCrossed,
  clock: Clock,
  file: FileText,
  image: Image,
  inbox: Inbox,
  briefcase: Briefcase,
  mail: Mail,
  scroll: ScrollText,
  plug: Plug,
  users: Users,
  team: UserRound,
};

export type NavItem = {
  href: string;
  label: string;
  icon: IconKey;
  adminOnly?: boolean;
  description?: string;
};

export const adminNav: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/events', label: 'Events', icon: 'calendar' },
  { href: '/admin/menu', label: 'Menu', icon: 'utensils' },
  { href: '/admin/hours', label: 'Hours', icon: 'clock' },
  { href: '/admin/content', label: 'Content', icon: 'file' },
  { href: '/admin/gallery', label: 'Gallery', icon: 'image' },
  { href: '/admin/team', label: 'Team', icon: 'team' },
  { href: '/admin/inquiries', label: 'Inquiries', icon: 'inbox' },
  { href: '/admin/careers', label: 'Careers', icon: 'briefcase' },
  { href: '/admin/newsletter', label: 'Newsletter', icon: 'mail', adminOnly: true },
  { href: '/admin/activity', label: 'Activity Log', icon: 'scroll', adminOnly: true },
  { href: '/admin/integrations', label: 'Integrations', icon: 'plug', adminOnly: true },
  { href: '/admin/users', label: 'Users', icon: 'users', adminOnly: true },
];
