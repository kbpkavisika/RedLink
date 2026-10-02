import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminHospitalKeys, getHospital, getHospitals, updateHospitalStatus } from '../api/adminHospitals';
import type { ApiError, HospitalDetail, HospitalSummary, UpdateHospitalStatusRequest } from '../types';

export function useHospitals() {
  return useQuery<HospitalSummary[], ApiError>({
    queryKey: adminHospitalKeys.list(),
    queryFn: getHospitals,
  });
}

// id null = nothing selected, so nothing is fetched
export function useHospital(id: number | null) {
  return useQuery<HospitalDetail, ApiError>({
    queryKey: adminHospitalKeys.detail(id ?? 0),
    queryFn: () => getHospital(id as number),
    enabled: id !== null,
  });
}

export function useDecideHospital(id: number) {
  const queryClient = useQueryClient();
  return useMutation<HospitalDetail, ApiError, UpdateHospitalStatusRequest>({
    mutationFn: (body) => updateHospitalStatus(id, body),
    onSuccess: (hospital) => {
      queryClient.setQueryData(adminHospitalKeys.detail(id), hospital);
      void queryClient.invalidateQueries({ queryKey: adminHospitalKeys.list() });
    },
    // 409: another admin decided first. Show what they decided.
    onError: (error) => {
      if (error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: adminHospitalKeys.all });
      }
    },
  });
}
