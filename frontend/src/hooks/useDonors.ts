import { useQuery } from '@tanstack/react-query';
import { donorKeys, getDonors } from '../api/donors';
import type { ApiError, DonorSummary } from '../types';

// The API client turns every failure into an ApiError, so `error` is typed as one
export function useDonors() {
  return useQuery<DonorSummary[], ApiError>({
    queryKey: donorKeys.all,
    queryFn: getDonors,
  });
}
