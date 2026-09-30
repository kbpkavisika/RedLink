import { MapPinOff } from 'lucide-react';
import { PublicLayout } from '../components/layout/PublicLayout';
import { LinkButton, Panel, StateView } from '../components/ui';

export function NotFoundPage() {
  return (
    <PublicLayout>
      <Panel>
        <StateView
          state="no-results"
          icon={MapPinOff}
          title="There's no page at this address"
          description="The link may be old or mistyped. Your home page has everything that's available to you."
          action={<LinkButton to="/">Go to my home page</LinkButton>}
        />
      </Panel>
    </PublicLayout>
  );
}
