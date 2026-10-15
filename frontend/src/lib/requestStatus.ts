import type { BadgeTone } from '../components/ui/Badge';
import type { RequestStatus } from '../types';

// How each request status looks everywhere: badges, filters, the request page.
// Its words are translated: t(`status.request.${status}`)
export const REQUEST_STATUS: Record<RequestStatus, { tone: BadgeTone }> = {
  OPEN: { tone: 'info' },
  FULFILLED: { tone: 'success' },
  CANCELLED: { tone: 'neutral' },
  EXPIRED: { tone: 'neutral' },
};
