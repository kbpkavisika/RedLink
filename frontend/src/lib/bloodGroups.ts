import type { BloodGroup } from '../types';

/**
 * Red cell compatibility: who a recipient can receive from (README "Matching engine").
 * The backend decides who matches (BloodGroup.compatibleDonors()); this copy only lists the choices
 * for the match filter, exact group first. Keep the two in step.
 */
const COMPATIBLE_DONORS: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
};

export function compatibleDonorGroups(recipient: BloodGroup): BloodGroup[] {
  return COMPATIBLE_DONORS[recipient];
}
