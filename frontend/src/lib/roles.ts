import type { Role } from '../types';

// Where each role lands after signing in, and where a wrong-role visit is sent back to
const homePaths: Record<Role, string> = {
  ADMIN: '/admin/hospitals',
  HOSPITAL_STAFF: '/hospital',
  DONOR: '/donor',
};

const labels: Record<Role, string> = {
  ADMIN: 'Admin',
  HOSPITAL_STAFF: 'Hospital staff',
  DONOR: 'Donor',
};

export function homePathFor(role: Role): string {
  return homePaths[role];
}

export function roleLabel(role: Role): string {
  return labels[role];
}
