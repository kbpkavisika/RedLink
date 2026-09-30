import type { CurrentUser } from '../types';

// Test users for the dev sign-in. Each one exercises a different branch of the guards and screens.
export const devUsers: { label: string; note: string; user: CurrentUser }[] = [
  {
    label: 'Admin',
    note: 'Lands on hospital approvals',
    user: { id: 1, fullName: 'Nimali Fernando', email: 'admin@redlink.lk', role: 'ADMIN', mustChangePassword: false },
  },
  {
    label: 'Hospital staff (approved)',
    note: 'Can open New request',
    user: {
      id: 2, fullName: 'Ruwan Silva', email: 'ruwan@cityhospital.lk', role: 'HOSPITAL_STAFF',
      hospitalId: 1, hospitalStatus: 'APPROVED', mustChangePassword: false,
    },
  },
  {
    label: 'Hospital staff (pending)',
    note: 'New request shows the Blocked state',
    user: {
      id: 3, fullName: 'Dilini Perera', email: 'dilini@nawaloka.lk', role: 'HOSPITAL_STAFF',
      hospitalId: 2, hospitalStatus: 'PENDING', mustChangePassword: false,
    },
  },
  {
    label: 'Hospital staff (rejected)',
    note: 'New request shows the rejected state',
    user: {
      id: 4, fullName: 'Kasun Jayawardena', email: 'kasun@example-clinic.lk', role: 'HOSPITAL_STAFF',
      hospitalId: 3, hospitalStatus: 'REJECTED', mustChangePassword: false,
    },
  },
  {
    label: 'Donor',
    note: 'Lands on the donor home',
    user: { id: 5, fullName: 'Kamal Perera', email: 'kamal@mail.lk', role: 'DONOR', mustChangePassword: false },
  },
  {
    label: 'Donor with a temporary password',
    note: 'Every page redirects to Change password',
    user: { id: 6, fullName: 'Sachini Wijesinghe', email: 'sachini@mail.lk', role: 'DONOR', mustChangePassword: true },
  },
];
