import type { RequestListItem } from '../../types';

// "2 coming · 1 declined" while open; "2 donated" once fulfilled
export function RepliesSummary({ request }: { request: RequestListItem }) {
  if (request.status === 'FULFILLED') {
    return <span className="text-success">{request.donated} donated</span>;
  }
  const parts = [
    request.coming > 0 && `${request.coming} coming`,
    request.withdrew > 0 && `${request.withdrew} withdrew`,
    request.declined > 0 && `${request.declined} declined`,
  ].filter(Boolean);
  return parts.length === 0 ? (
    <span className="text-text-subtle">No replies yet</span>
  ) : (
    <span className={request.coming > 0 ? 'text-ink' : 'text-text-muted'}>{parts.join(' · ')}</span>
  );
}
