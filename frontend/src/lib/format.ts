import type { BloodGroup } from '../types';

// The API sends "A-"; the UI shows the true minus sign "A−" (U+2212), as design.md requires
export function formatBloodGroup(group: BloodGroup): string {
  return group.replace('-', '−');
}
