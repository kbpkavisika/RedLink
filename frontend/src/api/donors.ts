import type { DonorSummary } from '../types';
import api from './client';

// TanStack Query keys for donor data, so mutations can refresh exactly what changed
export const donorKeys = {
  all: ['donors'] as const,
  detail: (id: number) => ['donors', id] as const,
};

export async function getDonors(): Promise<DonorSummary[]> {
  const { data } = await api.get<DonorSummary[]>('/donors');
  return data;
}

export async function getDonor(id: number): Promise<DonorSummary> {
  const { data } = await api.get<DonorSummary>(`/donors/${id}`);
  return data;
}
