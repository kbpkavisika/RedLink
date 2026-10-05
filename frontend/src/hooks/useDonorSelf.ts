import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  donorSelfKeys,
  getIncomingRequests,
  getMyProfile,
  respondToRequest,
  setMyAvailability,
  updateMyProfile,
  withdrawResponse,
} from '../api/donor';
import type { ApiError, DonorProfile, IncomingRequest, UpdateDonorProfileRequest } from '../types';

export function useMyProfile() {
  return useQuery<DonorProfile, ApiError>({ queryKey: donorSelfKeys.profile(), queryFn: getMyProfile });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<DonorProfile, ApiError, UpdateDonorProfileRequest>({
    mutationFn: updateMyProfile,
    onSuccess: (profile) => queryClient.setQueryData(donorSelfKeys.profile(), profile),
  });
}

export function useIncomingRequests() {
  return useQuery<IncomingRequest[], ApiError>({ queryKey: donorSelfKeys.incoming(), queryFn: getIncomingRequests });
}

// Replaces one request in the cached list with the server's answer, so the page updates without a reload
function useReplaceIncoming() {
  const queryClient = useQueryClient();
  return {
    replace: (updated: IncomingRequest) =>
      queryClient.setQueryData<IncomingRequest[]>(donorSelfKeys.incoming(), (list) =>
        list?.map((request) => (request.requestId === updated.requestId ? updated : request)),
      ),
    // A 409 means the list is out of date (closed, or answered in another tab): reload it
    refresh: () => void queryClient.invalidateQueries({ queryKey: donorSelfKeys.incoming() }),
  };
}

export function useRespond() {
  const { replace, refresh } = useReplaceIncoming();
  return useMutation<IncomingRequest, ApiError, { requestId: number; status: 'ACCEPTED' | 'DECLINED' }>({
    mutationFn: ({ requestId, status }) => respondToRequest(requestId, status),
    onSuccess: replace,
    onError: (error) => error.status === 409 && refresh(),
  });
}

export function useWithdraw() {
  const { replace, refresh } = useReplaceIncoming();
  return useMutation<IncomingRequest, ApiError, number>({
    mutationFn: withdrawResponse,
    onSuccess: replace,
    onError: (error) => error.status === 409 && refresh(),
  });
}

/**
 * The availability switch flips straight away (optimistic) and flips back if the server refuses,
 * so the switch never waits on the network.
 */
export function useSetAvailability() {
  const queryClient = useQueryClient();
  const key = donorSelfKeys.profile();
  return useMutation<DonorProfile, ApiError, boolean, { previous?: DonorProfile }>({
    mutationFn: setMyAvailability,
    onMutate: async (available) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DonorProfile>(key);
      if (previous) queryClient.setQueryData<DonorProfile>(key, { ...previous, available });
      return { previous };
    },
    onError: (_error, _available, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (profile) => queryClient.setQueryData(key, profile),
  });
}
