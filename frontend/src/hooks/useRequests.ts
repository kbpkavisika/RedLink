import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  closeRequest,
  createRequest,
  getMatches,
  getRequest,
  getResponses,
  requestKeys,
  type MatchFilters,
} from '../api/requests';
import type {
  ApiError,
  CreateBloodRequestRequest,
  MatchedDonor,
  PostedRequestResponse,
  RequestOverview,
  RequestResponse,
  UpdateRequestStatusRequest,
} from '../types';

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation<PostedRequestResponse, ApiError, CreateBloodRequestRequest>({
    mutationFn: createRequest,
    onSuccess: ({ request, notifiedCount }) => {
      // The request page opens straight from the success screen, so give it the data already in hand
      queryClient.setQueryData<RequestOverview>(requestKeys.detail(request.id), { request, notifiedCount, donatedDonorIds: [] });
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

// Replies arrive while staff watch the page, so check again every 30 seconds while it's open
export function useResponses(id: number) {
  return useQuery<RequestResponse[], ApiError>({
    queryKey: requestKeys.responses(id),
    queryFn: () => getResponses(id),
    refetchInterval: 30_000,
  });
}

// Closing changes the request, its matches (none once closed) and how its replies read
export function useCloseRequest(id: number) {
  const queryClient = useQueryClient();
  return useMutation<RequestOverview, ApiError, UpdateRequestStatusRequest>({
    mutationFn: (body) => closeRequest(id, body),
    onSuccess: (overview) => {
      queryClient.setQueryData(requestKeys.detail(id), overview);
      void queryClient.invalidateQueries({ queryKey: [...requestKeys.all, 'matches', id] });
      void queryClient.invalidateQueries({ queryKey: requestKeys.responses(id) });
    },
    // 409: someone else closed it first; show what they did
    onError: (error) => {
      if (error.status === 409) void queryClient.invalidateQueries({ queryKey: requestKeys.detail(id) });
    },
  });
}
