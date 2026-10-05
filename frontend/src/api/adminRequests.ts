import type { AdminRequestDetail, RequestListItem } from '../types';
import api from './client';

export const adminRequestKeys = {
  all: ['admin', 'requests'] as const,
  list: () => [...adminRequestKeys.all, 'list'] as const,
  detail: (id: number) => [...adminRequestKeys.all, 'detail', id] as const,
};

// A7: the newest 500 across every hospital; the page searches and filters within them
export async function getAllRequests(): Promise<RequestListItem[]> {
  const { data } = await api.get<RequestListItem[]>('/admin/requests');
  return data;
}

// A8: read-only, with every reply and who donated
export async function getAdminRequest(id: number): Promise<AdminRequestDetail> {
  const { data } = await api.get<AdminRequestDetail>(`/admin/requests/${id}`);
  return data;
}
