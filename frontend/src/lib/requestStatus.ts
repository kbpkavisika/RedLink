import type { BadgeTone } from '../components/ui/Badge';
import type { RequestStatus } from '../types';

// How each request status reads and looks everywhere: badges, filters, the request page
export const REQUEST_STATUS: Record<RequestStatus, { label: string; tone: BadgeTone }> = {
  OPEN: { label: 'Open', tone: 'info' },
  FULFILLED: { label: 'Fulfilled', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
};
