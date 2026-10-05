import { useQuery } from '@tanstack/react-query';
import { adminRequestKeys, getAdminRequest, getAllRequests } from '../api/adminRequests';
import type { AdminRequestDetail, ApiError, RequestListItem } from '../types';

export function useAllRequests() {
  return useQuery<RequestListItem[], ApiError>({
    queryKey: adminRequestKeys.list(),
    queryFn: getAllRequests,
    refetchInterval: 60_000,
  });
}

// id null = nothing selected, so nothing is fetched
export function useAdminRequest(id: number | null) {
  return useQuery<AdminRequestDetail, ApiError>({
    queryKey: adminRequestKeys.detail(id ?? 0),
    queryFn: () => getAdminRequest(id as number),
    enabled: id !== null,
  });
}
