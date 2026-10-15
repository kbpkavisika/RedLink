import type { Role } from '../types';

// Where each role lands after signing in, and where a wrong-role visit is sent back to
const homePaths: Record<Role, string> = {
  ADMIN: '/admin/hospitals',
  HOSPITAL_STAFF: '/hospital',
  DONOR: '/donor',
};

export function homePathFor(role: Role): string {
  return homePaths[role];
}

// A role's name is translated: t(`status.role.${role}`)
