import type { DonorProfile, IncomingRequest, UpdateDonorProfileRequest } from '../types';
import api from './client';

// The signed-in donor's own data (/api/donor/...). Not to be confused with api/donors.ts, the admin's donor list.
export const donorSelfKeys = {
  all: ['donor', 'me'] as const,
  profile: () => [...donorSelfKeys.all, 'profile'] as const,
  incoming: () => [...donorSelfKeys.all, 'incoming'] as const,
};

export async function getMyProfile(): Promise<DonorProfile> {
  const { data } = await api.get<DonorProfile>('/donor/me');
  return data;
}

export async function updateMyProfile(body: UpdateDonorProfileRequest): Promise<DonorProfile> {
  const { data } = await api.patch<DonorProfile>('/donor/me', body);
  return data;
}

export async function setMyAvailability(available: boolean): Promise<DonorProfile> {
  const { data } = await api.patch<DonorProfile>('/donor/me/availability', { available });
  return data;
}

// Open requests this donor can give to: critical first, then their city, then the soonest deadline
export async function getIncomingRequests(): Promise<IncomingRequest[]> {
  const { data } = await api.get<IncomingRequest[]>('/donor/requests');
  return data;
}

// Accept or decline, once. Returns the request as the donor now sees it. 409 if already answered or not eligible.
export async function respondToRequest(requestId: number, status: 'ACCEPTED' | 'DECLINED'): Promise<IncomingRequest> {
  const { data } = await api.post<IncomingRequest>(`/requests/${requestId}/responses`, { status });
  return data;
}

// "I can't make it anymore": only an accepted reply, only while the request is open
export async function withdrawResponse(requestId: number): Promise<IncomingRequest> {
  const { data } = await api.patch<IncomingRequest>(`/requests/${requestId}/responses/me`, { status: 'WITHDRAWN' });
  return data;
}
