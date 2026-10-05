import type {
  BloodGroup,
  CreateBloodRequestRequest,
  MatchedDonor,
  PostedRequestResponse,
  RequestOverview,
  RequestResponse,
  UpdateRequestStatusRequest,
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
  responses: (id: number) => [...requestKeys.all, 'responses', id] as const,
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

// H7: donors' replies, accepted first
export async function getResponses(id: number): Promise<RequestResponse[]> {
  const { data } = await api.get<RequestResponse[]>(`/requests/${id}/responses`);
  return data;
}

// H8, H9: fulfil (with the donors who gave blood) or cancel. 409 if it's already closed.
export async function closeRequest(id: number, body: UpdateRequestStatusRequest): Promise<RequestOverview> {
  const { data } = await api.patch<RequestOverview>(`/requests/${id}/status`, body);
  return data;
}
