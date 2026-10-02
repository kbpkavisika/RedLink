import type { HospitalDetail, HospitalSummary, UpdateHospitalStatusRequest } from '../types';
import api from './client';

// TanStack Query keys for the admin's hospital data, so a decision refreshes exactly what changed
export const adminHospitalKeys = {
  all: ['admin', 'hospitals'] as const,
  list: () => [...adminHospitalKeys.all, 'list'] as const,
  detail: (id: number) => [...adminHospitalKeys.all, 'detail', id] as const,
};

// Every hospital, newest first. The page filters by status itself, so each tab can show its count.
export async function getHospitals(): Promise<HospitalSummary[]> {
  const { data } = await api.get<HospitalSummary[]>('/admin/hospitals');
  return data;
}

export async function getHospital(id: number): Promise<HospitalDetail> {
  const { data } = await api.get<HospitalDetail>(`/admin/hospitals/${id}`);
  return data;
}

// Approve or reject a PENDING hospital; returns it updated. 409 if someone already decided.
export async function updateHospitalStatus(id: number, body: UpdateHospitalStatusRequest): Promise<HospitalDetail> {
  const { data } = await api.patch<HospitalDetail>(`/admin/hospitals/${id}/status`, body);
  return data;
}
