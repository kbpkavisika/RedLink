import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { donorSelfKeys, getIncomingRequests, getMyProfile, setMyAvailability } from '../api/donor';
import type { ApiError, DonorProfile, IncomingRequest } from '../types';

export function useMyProfile() {
  return useQuery<DonorProfile, ApiError>({ queryKey: donorSelfKeys.profile(), queryFn: getMyProfile });
}

export function useIncomingRequests() {
  return useQuery<IncomingRequest[], ApiError>({ queryKey: donorSelfKeys.incoming(), queryFn: getIncomingRequests });
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
