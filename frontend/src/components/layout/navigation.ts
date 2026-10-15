import {
  Building2,
  ClipboardList,
  Droplet,
  HeartHandshake,
  History,
  House,
  LayoutDashboard,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { matchPath } from 'react-router-dom';
import type { Translation } from '../../locales/en';
import type { Role } from '../../types';

// A key under "nav" in the translations
export type NavLabel = keyof Translation['nav'];

export interface NavItem {
  label: NavLabel;
  path: string;
  icon: LucideIcon;
  // Only active on this exact path (for role home pages that other paths start with)
  end?: boolean;
}

// Sidebar items per role. A role never sees another role's links.
export const navigation: Record<Role, NavItem[]> = {
  HOSPITAL_STAFF: [
    { label: 'dashboard', path: '/hospital', icon: LayoutDashboard, end: true },
    { label: 'requests', path: '/hospital/requests', icon: ClipboardList },
  ],
  DONOR: [
    { label: 'home', path: '/donor', icon: House, end: true },
    { label: 'requests', path: '/donor/requests', icon: HeartHandshake },
    { label: 'history', path: '/donor/history', icon: History },
    { label: 'profile', path: '/donor/profile', icon: UserRound },
  ],
  ADMIN: [
    { label: 'hospitalApprovals', path: '/admin/hospitals', icon: Building2 },
    { label: 'users', path: '/admin/users', icon: Users },
    { label: 'requests', path: '/admin/requests', icon: ClipboardList },
    { label: 'donors', path: '/admin/donors', icon: Droplet },
  ],
};

// Titles for pages that aren't sidebar items; checked first
const extraTitles: { pattern: string; title: NavLabel }[] = [
  { pattern: '/hospital/requests/new', title: 'newRequest' },
  { pattern: '/hospital/requests/:id', title: 'requestDetail' },
  { pattern: '/change-password', title: 'changePassword' },
  { pattern: '/notifications', title: 'notifications' },
];

// The top bar title for the current page, as a "nav" key; null = just "RedLink"
export function pageTitleFor(pathname: string, role: Role): NavLabel | null {
  const extra = extraTitles.find(({ pattern }) => matchPath(pattern, pathname));
  if (extra) return extra.title;

  const item = navigation[role]
    .filter((nav) => (nav.end ? pathname === nav.path : pathname.startsWith(nav.path)))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return item?.label ?? null;
}
