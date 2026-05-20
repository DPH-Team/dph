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

export type NavItem = {
  href: string;
  label: string;
  icon: IconKey;
  adminOnly?: boolean;
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
  { href: '/admin/activity', label: 'Activity Log', icon: 'scroll' },
  { href: '/admin/integrations', label: 'Integrations', icon: 'plug', adminOnly: true },
  { href: '/admin/users', label: 'Users', icon: 'users', adminOnly: true },
];
