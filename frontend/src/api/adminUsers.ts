import type { AddStaffRequest, Role, UserSummary } from '../types';
import api from './client';

export interface UserSearch {
  role?: Role;
  q?: string;
}

// TanStack Query keys for the admin's user data
export const adminUserKeys = {
  all: ['admin', 'users'] as const,
  search: (search: UserSearch) => [...adminUserKeys.all, 'search', search] as const,
};

// Newest first, at most 200. Both filters are optional; q matches part of the name or email.
export async function searchUsers({ role, q }: UserSearch): Promise<UserSummary[]> {
  const { data } = await api.get<UserSummary[]>('/admin/users', {
    params: { role: role || undefined, q: q?.trim() || undefined },
  });
  return data;
}

export async function addStaff(body: AddStaffRequest): Promise<UserSummary> {
  const { data } = await api.post<UserSummary>('/admin/users', body);
  return data;
}
