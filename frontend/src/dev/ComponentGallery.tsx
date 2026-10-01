import { Eye, EyeOff, Plus, SlidersHorizontal } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  BloodGroupBadge,
  Button,
  Chip,
  Input,
  LinkButton,
  Panel,
  StateView,
  StepProgress,
  Switch,
  Table,
  UrgencyTag,
  type Column,
} from '../components/ui';
import { BLOOD_GROUPS, type ApiError, type DonorSummary } from '../types';

// Development only (/dev/components): every component and screen state.
// The route and this file are left out of production builds.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-eyebrow text-primary uppercase">{title}</h2>
      {children}
    </section>
  );
}

const swatches = [
  'primary', 'primary-hover', 'primary-soft', 'primary-subtle', 'ink', 'ink-2', 'text-muted', 'text-subtle',
  'bg', 'surface', 'neutral-soft', 'border', 'border-strong', 'success', 'success-soft', 'warning',
  'warning-mid', 'warning-soft', 'info', 'info-soft',
];

const sampleDonors: DonorSummary[] = [
  { id: 1, name: 'Kamal Perera', bloodGroup: 'O+', phone: '0771234567', city: 'Colombo', available: true, lastDonationDate: '2026-05-01' },
  { id: 2, name: 'Tharushi Bandara', bloodGroup: 'AB-', phone: '0719876543', city: 'Kandy', available: false, lastDonationDate: '2026-08-12' },
  { id: 3, name: 'Ishan Rathnayake', bloodGroup: 'A-', phone: '0765554321', city: 'Jaffna', available: true, lastDonationDate: null },
];

const donorColumns: Column<DonorSummary>[] = [
  {
    key: 'donor',
    header: 'Donor',
    cell: (donor) => (
      <div className="flex items-center gap-3">
        <BloodGroupBadge group={donor.bloodGroup} />
        <div>
          <p className="font-medium">{donor.name}</p>
          <p className="text-caption text-text-subtle">{donor.city}</p>
        </div>
      </div>
    ),
  },
  { key: 'phone', header: 'Phone', cell: (donor) => donor.phone },
  {
    key: 'status',
    header: 'Status',
    align: 'right',
    cell: (donor) =>
      donor.available ? <Badge tone="success">Available</Badge> : <Badge>Unavailable</Badge>,
  },
];

const sampleError: ApiError = {
  status: 504,
  error: 'Gateway Timeout',
  message: "The server took too long to answer. Your filters are kept, so you can try again.",
  fieldErrors: [],
  ref: '7f3a-19c2',
  timestamp: new Date().toISOString(),
  path: '/api/donors',
};

export default function ComponentGallery() {
  const [available, setAvailable] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [chips, setChips] = useState(['Group: AB−', 'City: Jaffna']);

  return (
    <div className="mx-auto flex w-full max-w-[1312px] flex-col gap-12 px-4 py-8 sm:px-8 lg:py-12">
      <header className="flex flex-col gap-1">
        <p className="text-eyebrow text-primary uppercase">Development only</p>
        <h1 className="font-display text-display-lg text-ink">Component gallery</h1>
        <p className="max-w-[560px] text-body text-text-muted">
          Every UI building block and screen state from design.md. To try the app as each role, sign in with the
          sample accounts (see "Sample data" in the README).
        </p>
      </header>

      <Section title="Colours">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {swatches.map((name) => (
            <div key={name} className="flex items-center gap-2.5">
              <span
                className="size-9 shrink-0 rounded-lg border border-border"
                style={{ background: `var(--color-${name})` }}
              />
              <code className="font-mono text-caption text-text-muted">{name}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <Panel padded>
          <div className="flex flex-col gap-3">
            <p className="font-display text-display-xl">Stop calling donors one by one.</p>
            <p className="font-display text-display-lg">Page title</p>
            <p className="font-display text-display-sm">Section headline</p>
            <p className="font-display text-title-lg">City Hospital needs A+</p>
            <p className="text-title-md">We couldn't load donors</p>
            <p className="text-body-lg">Body large: hero supporting copy</p>
            <p className="text-body">Body: default text for descriptions and table cells</p>
            <p className="text-caption text-text-subtle">Caption: helper text and meta</p>
            <p className="font-mono text-mono-sm text-text-subtle">Error 504 · ref 7f3a-19c2</p>
          </div>
        </Panel>
      </Section>

      <Section title="Buttons">
        <Panel padded>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button>Primary</Button>
              <Button variant="dark">Dark</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="text">Text link</Button>
              <Button variant="icon" aria-label="Filters">
                <SlidersHorizontal size={18} aria-hidden="true" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Small 38</Button>
              <Button size="md">Medium 40</Button>
              <Button size="lg">Large 48</Button>
              <Button leftIcon={<Plus size={16} aria-hidden="true" />}>With icon</Button>
              <Button loading>Saving</Button>
              <Button disabled>Disabled</Button>
              <LinkButton to="/dev/components" variant="outline">
                Link button
              </LinkButton>
            </div>
          </div>
        </Panel>
      </Section>

      <Section title="Form fields">
        <Panel padded>
          <div className="grid gap-5 md:grid-cols-2">
            <Input label="Email" type="email" placeholder="name@hospital.lk" autoComplete="email" />
            <Input label="City" hint="Used to find donors nearby" placeholder="Colombo" />
            <Input
              label="Hospital email"
              defaultValue="ruwan@gmail"
              error="Enter a hospital email, e.g. name@hospital.lk"
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              labelAction={<Link to="/forgot-password">Forgot password?</Link>}
              rightSlot={
                <Button
                  variant="icon"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </Button>
              }
            />
          </div>
        </Panel>
      </Section>

      <Section title="Badges, chips and tags">
        <Panel padded>
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge tone="info">Matching</Badge>
              <Badge tone="success">Accepted</Badge>
              <Badge tone="warning">Under review</Badge>
              <Badge tone="error">Rejected</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <Chip key={chip} label={chip} onRemove={() => setChips(chips.filter((c) => c !== chip))} />
              ))}
              {chips.length === 0 && (
                <Button variant="text" onClick={() => setChips(['Group: AB−', 'City: Jaffna'])}>
                  Reset chips
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <UrgencyTag urgency="CRITICAL" />
              <UrgencyTag urgency="HIGH" />
              <UrgencyTag urgency="MEDIUM" />
              <UrgencyTag urgency="LOW" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {BLOOD_GROUPS.map((group) => (
                <BloodGroupBadge key={group} group={group} />
              ))}
              <BloodGroupBadge group="AB-" size="lg" />
            </div>
          </div>
        </Panel>
      </Section>

      <Section title="Switch and step progress">
        <div className="grid gap-6 md:grid-cols-2">
          <Panel padded>
            <Switch
              checked={available}
              onChange={setAvailable}
              label="Available for requests"
              description="Turn off while travelling or unwell"
            />
          </Panel>
          <Panel padded>
            <div className="flex flex-col gap-5">
              <StepProgress steps={['Registered', 'Under review', 'Approved']} current={1} />
              <StepProgress steps={['Registered', 'Under review', 'Approved']} current={3} />
              <StepProgress steps={['Registered', 'Under review', 'Approved']} current={1} tone="error" />
            </div>
          </Panel>
        </div>
      </Section>

      <Section title="Table">
        <Panel title="Donors" actions={<Button variant="outline" size="sm">Export</Button>}>
          <Table caption="Sample donors" rows={sampleDonors} rowKey={(donor) => donor.id} columns={donorColumns} />
        </Panel>
      </Section>

      <Section title="Screen states">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Panel title="Loading">
            <StateView state="loading" rows={4} />
          </Panel>
          <Panel title="Empty · first use">
            <StateView
              state="empty"
              title="No blood requests yet"
              description="Post a request and RedLink finds every compatible, eligible donor nearby."
              action={<Button>Create your first request</Button>}
              secondaryAction={<Button variant="text">How matching works</Button>}
            />
          </Panel>
          <Panel title="Empty · no results">
            <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3.5">
              <Chip label={'Group: AB−'} />
              <Chip label="City: Jaffna" />
            </div>
            <StateView
              state="no-results"
              title={'No eligible AB− donors in Jaffna'}
              description={'Try nearby cities, or include compatible groups such as A−, B− and O−.'}
              secondaryAction={<Button variant="outline">Clear filters</Button>}
              action={<Button variant="dark">Show compatible</Button>}
            />
          </Panel>
          <Panel title="Error">
            <StateView
              state="error"
              title="We couldn't load donors"
              error={sampleError}
              onRetry={() => undefined}
            />
          </Panel>
          <Panel title="Success">
            <StateView
              state="success"
              title="Request #RQ-1043 is live"
              description="We notified the top 10 of 46 eligible donors. You'll get an alert as each one replies."
              secondaryAction={<Button variant="outline">Back to requests</Button>}
              action={<Button>Track responses</Button>}
            />
          </Panel>
          <Panel title="Blocked">
            <StateView
              state="blocked"
              title="Posting unlocks after approval"
              description="An admin is reviewing Nawaloka Hospital's registration. This usually takes 1–2 working days."
            >
              <StepProgress steps={['Registered', 'Under review', 'Approved']} current={1} />
            </StateView>
          </Panel>
        </div>
      </Section>
    </div>
  );
}
