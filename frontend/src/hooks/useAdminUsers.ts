import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminHospitalKeys } from '../api/adminHospitals';
import { addStaff, adminUserKeys, searchUsers, setTemporaryPassword, type UserSearch } from '../api/adminUsers';
import type { AddStaffRequest, ApiError, SetTemporaryPasswordRequest, UserSummary } from '../types';

export function useUserSearch(search: UserSearch) {
  return useQuery<UserSummary[], ApiError>({
    queryKey: adminUserKeys.search(search),
    queryFn: () => searchUsers(search),
    // Keep showing the previous results while a new search loads, so the table doesn't flash
    placeholderData: keepPreviousData,
  });
}

export function useAddStaff() {
  const queryClient = useQueryClient();
  return useMutation<UserSummary, ApiError, AddStaffRequest>({
    mutationFn: addStaff,
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
      // The hospital's staff list on /admin/hospitals changed too
      if (user.hospitalId) {
        void queryClient.invalidateQueries({ queryKey: adminHospitalKeys.detail(user.hospitalId) });
      }
    },
  });
}

export function useSetTemporaryPassword(id: number) {
  const queryClient = useQueryClient();
  return useMutation<UserSummary, ApiError, SetTemporaryPasswordRequest>({
    mutationFn: (body) => setTemporaryPassword(id, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminUserKeys.all }),
  });
}
