import { REQUEST_STATUS } from '../../lib/requestStatus';
import type { RequestStatus } from '../../types';
import { Badge } from './Badge';

// A request's status as a word (never colour alone): Open · Fulfilled · Cancelled · Expired
export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge tone={REQUEST_STATUS[status].tone}>{REQUEST_STATUS[status].label}</Badge>;
}
