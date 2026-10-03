import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createRequest, getMatches, getRequest, requestKeys, type MatchFilters } from '../api/requests';
import type {
  ApiError,
  CreateBloodRequestRequest,
  MatchedDonor,
  PostedRequestResponse,
  RequestOverview,
} from '../types';

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation<PostedRequestResponse, ApiError, CreateBloodRequestRequest>({
    mutationFn: createRequest,
    onSuccess: ({ request, notifiedCount }) => {
      // The request page opens straight from the success screen, so give it the data already in hand
      queryClient.setQueryData<RequestOverview>(requestKeys.detail(request.id), { request, notifiedCount });
    },
  });
}

export function useRequest(id: number) {
  return useQuery<RequestOverview, ApiError>({
    queryKey: requestKeys.detail(id),
    queryFn: () => getRequest(id),
  });
}

export function useMatches(id: number, filters: MatchFilters) {
  return useQuery<MatchedDonor[], ApiError>({
    queryKey: requestKeys.matches(id, filters),
    queryFn: () => getMatches(id, filters),
    // Keep the current list on screen while a new filter loads
    placeholderData: keepPreviousData,
  });
}
