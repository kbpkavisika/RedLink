import type { CurrentUser, LoginRequest, LoginResponse } from '../types';
import api from './client';

// Planned backend endpoints (feature/auth-jwt). Until they exist, these fail and the user stays signed out.

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', body);
  return data;
}

// Restores the session after a page reload
export async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data } = await api.get<CurrentUser>('/auth/me');
  return data;
}
