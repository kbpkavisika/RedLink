import { Construction } from 'lucide-react';
import { Panel, StateView } from '../components/ui';

interface ComingSoonPageProps {
  title: string;
  // Which user stories or branch will build it
  description: string;
}

// Placeholder for pages that exist in the route table but are built in later feature branches
export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <Panel>
      <StateView state="empty" icon={Construction} title={`${title} is coming soon`} description={description} />
    </Panel>
  );
}
