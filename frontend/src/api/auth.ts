import type { ChangePasswordRequest, CurrentUser, LoginRequest, LoginResponse } from '../types';
import api from './client';

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', body);
  return data;
}

// Returns the updated user (mustChangePassword is now false). The current token stays valid.
export async function changePassword(body: ChangePasswordRequest): Promise<CurrentUser> {
  const { data } = await api.patch<CurrentUser>('/auth/me/password', body);
  return data;
}

// Restores the session after a page reload
export async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data } = await api.get<CurrentUser>('/auth/me');
  return data;
}
