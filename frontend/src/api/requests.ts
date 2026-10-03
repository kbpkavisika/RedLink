import type {
  BloodGroup,
  CreateBloodRequestRequest,
  MatchedDonor,
  PostedRequestResponse,
  RequestOverview,
} from '../types';
import api from './client';

export interface MatchFilters {
  bloodGroup?: BloodGroup;
  city?: string;
}

// TanStack Query keys for blood requests, so posting or closing one refreshes exactly what changed
export const requestKeys = {
  all: ['requests'] as const,
  detail: (id: number) => [...requestKeys.all, 'detail', id] as const,
  matches: (id: number, filters: MatchFilters = {}) => [...requestKeys.all, 'matches', id, filters] as const,
};

// 201: saved as OPEN, and the top matches were notified. 403 if the hospital isn't approved.
export async function createRequest(body: CreateBloodRequestRequest): Promise<PostedRequestResponse> {
  const { data } = await api.post<PostedRequestResponse>('/requests', body);
  return data;
}

// 404 for another hospital's request
export async function getRequest(id: number): Promise<RequestOverview> {
  const { data } = await api.get<RequestOverview>(`/requests/${id}`);
  return data;
}

// Ranked best first. Axios encodes the params, so "O+" is sent as O%2B.
export async function getMatches(id: number, filters: MatchFilters = {}): Promise<MatchedDonor[]> {
  const { data } = await api.get<MatchedDonor[]>(`/requests/${id}/matches`, { params: filters });
  return data;
}
