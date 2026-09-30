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
import type { Role } from '../../types';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  // Only active on this exact path (for role home pages that other paths start with)
  end?: boolean;
}

// Sidebar items per role. A role never sees another role's links.
export const navigation: Record<Role, NavItem[]> = {
  HOSPITAL_STAFF: [
    { label: 'Dashboard', path: '/hospital', icon: LayoutDashboard, end: true },
    { label: 'Requests', path: '/hospital/requests', icon: ClipboardList },
  ],
  DONOR: [
    { label: 'Home', path: '/donor', icon: House, end: true },
    { label: 'Requests', path: '/donor/requests', icon: HeartHandshake },
    { label: 'History', path: '/donor/history', icon: History },
    { label: 'Profile', path: '/donor/profile', icon: UserRound },
  ],
  ADMIN: [
    { label: 'Hospital approvals', path: '/admin/hospitals', icon: Building2 },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Requests', path: '/admin/requests', icon: ClipboardList },
    { label: 'Donors', path: '/admin/donors', icon: Droplet },
  ],
};

// Titles for pages that aren't sidebar items; checked first
const extraTitles: { pattern: string; title: string }[] = [
  { pattern: '/hospital/requests/new', title: 'New request' },
  { pattern: '/hospital/requests/:id', title: 'Request detail' },
  { pattern: '/change-password', title: 'Change password' },
];

// The top bar title for the current page
export function pageTitleFor(pathname: string, role: Role): string {
  const extra = extraTitles.find(({ pattern }) => matchPath(pattern, pathname));
  if (extra) return extra.title;

  const item = navigation[role]
    .filter((nav) => (nav.end ? pathname === nav.path : pathname.startsWith(nav.path)))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return item?.label ?? 'RedLink';
}
