import clsx from 'clsx';
import {
  ArrowRight,
  BellRing,
  Building2,
  Check,
  CheckCircle2,
  ClipboardList,
  Droplet,
  HeartHandshake,
  ListOrdered,
  Lock,
  MapPin,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { NotificationBell } from '../components/layout/NotificationBell';
import { UserMenu } from '../components/layout/UserMenu';
import { LinkButton } from '../components/ui';
import { compatibleDonorGroups } from '../lib/bloodGroups';
import { formatBloodGroup } from '../lib/format';
import { homePathFor } from '../lib/roles';
import { BLOOD_GROUPS, type BloodGroup } from '../types';

/**
 * "/": the public home page. Everyone sees it, signed in or not; only the buttons change.
 *   signed out → Sign in · Become a donor · Register a hospital
 *   signed in  → Dashboard (their role's home), in the hero, the closing band and the profile menu
 * The dashboards themselves stay behind RequireAuth.
 */
export function HomePage() {
  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main>
        <Hero />
        <Facts />
        <HowItWorks />
        <Compatibility />
        <ForWho />
        <Trust />
        <ClosingBand />
      </main>
      <SiteFooter />
    </div>
  );
}

// Dashboard or sign-in buttons, depending on who is looking. Nothing while a saved session is being checked.
function AccountActions() {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <span className="h-10 w-32" aria-hidden="true" />;
  }
  // Signed in: the profile menu next to this has "Dashboard"
  if (user) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        to="/login"
        className="inline-flex h-10 items-center rounded-md px-4 text-body font-semibold text-ink no-underline hover:bg-bg hover:text-ink"
      >
        Sign in
      </Link>
      <LinkButton to="/register/donor" className="hidden sm:inline-flex">
        Become a donor
      </LinkButton>
    </div>
  );
}

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#compatibility', label: 'Compatibility' },
  { href: '#donors', label: 'Donors' },
  { href: '#hospitals', label: 'Hospitals' },
];

function SiteHeader() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-surface/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-[1312px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link to="/" aria-label="RedLink home">
          <img src="/brand/redlink-logo.svg" alt="RedLink" className="h-8" />
        </Link>
        <nav aria-label="Site" className="hidden items-center gap-1 text-label font-medium md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-text-muted no-underline transition-colors hover:bg-bg hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <AccountActions />
          {user && <NotificationBell />}
          {user && <UserMenu />}
        </div>
      </div>
    </header>
  );
}

const DROP_PATH =
  'M12 2.5c-.3 0-.6.2-.8.4C9.6 5 5 11 5 14.8 5 18.8 8.1 22 12 22s7-3.2 7-7.2C19 11 14.4 5 12.8 2.9c-.2-.2-.5-.4-.8-.4Z';

function Hero() {
  const { user } = useAuth();
  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      {/* Backdrop: grid, red glows and a large drop bleeding off the right edge */}
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-40 right-[-10%] -z-10 size-[640px] rounded-full bg-primary-glow/30 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-56 -left-40 -z-10 size-[520px] rounded-full bg-primary/25 blur-[120px]"
        aria-hidden="true"
      />
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 -bottom-64 -z-10 h-[640px] w-[640px] fill-white/[0.03]"
      >
        <path d={DROP_PATH} />
      </svg>

      <div className="mx-auto grid max-w-[1312px] items-center gap-14 px-4 pt-16 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_480px] lg:pt-24 lg:pb-28">
        <div className="flex flex-col gap-7">
          <p className="animate-rise inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 py-1.5 pr-3.5 pl-2.5 text-label font-medium text-on-dark-muted backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-glow opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary-glow" />
            </span>
            Blood donor matching for Sri Lanka
          </p>

          <h1
            className="animate-rise max-w-[680px] font-display text-[40px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[56px] lg:text-[64px]"
            style={{ animationDelay: '80ms' }}
          >
            Stop calling donors <span className="text-gradient-red">one by one.</span>
          </h1>

          <p className="animate-rise max-w-[540px] text-body-lg text-on-dark-muted sm:text-[18px] sm:leading-7" style={{ animationDelay: '160ms' }}>
            A hospital posts what it needs. RedLink ranks every compatible, eligible donor nearby, notifies the best
            matches, and shows who is coming.
          </p>

          <div className="animate-rise flex flex-wrap items-center gap-3" style={{ animationDelay: '240ms' }}>
            {user ? (
              <LinkButton
                to={homePathFor(user.role)}
                size="lg"
                className="shadow-glow"
                rightIcon={<ArrowRight size={18} aria-hidden="true" />}
              >
                Go to dashboard
              </LinkButton>
            ) : (
              <>
                <LinkButton
                  to="/register/donor"
                  size="lg"
                  className="shadow-glow"
                  leftIcon={<Droplet size={18} aria-hidden="true" />}
                >
                  Become a donor
                </LinkButton>
                <Link
                  to="/register/hospital"
                  className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-5 text-body-input font-semibold text-white no-underline backdrop-blur transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white focus-visible:shadow-focus focus-visible:outline-none"
                >
                  <Building2 size={18} aria-hidden="true" />
                  Register a hospital
                </Link>
              </>
            )}
          </div>

          <ul
            className="animate-rise flex flex-wrap gap-x-6 gap-y-2 text-label text-on-dark-muted"
            style={{ animationDelay: '320ms' }}
          >
            {['Admin-verified hospitals', '90-day donor safety', 'No patient data stored'].map((point) => (
              <li key={point} className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-primary-on-dark" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>

          {!user && (
            <p className="animate-rise text-label text-on-dark-muted" style={{ animationDelay: '400ms' }}>
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-white underline-offset-4 hover:text-white hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </div>

        <MatchPreview />
      </div>
    </section>
  );
}

const PREVIEW_DONORS = [
  { initials: 'KP', name: 'Kasun P.', group: 'B+', reason: 'Exact group · Same city', distance: '1.2 km', status: 'accepted' },
  { initials: 'DR', name: 'Dilini R.', group: 'B+', reason: 'Exact group · 214 days', distance: '3.4 km', status: 'accepted' },
  { initials: 'AF', name: 'Ashan F.', group: 'O+', reason: 'Compatible · Same city', distance: '2.0 km', status: 'notified' },
  { initials: 'NW', name: 'Nadeesha W.', group: 'O−', reason: 'Compatible · 180 days', distance: '5.8 km', status: 'notified' },
] as const;

// An illustration of a request being matched; decorative, so hidden from screen readers
function MatchPreview() {
  return (
    <div className="relative hidden lg:block" aria-hidden="true">
      <div className="animate-rise relative rounded-3xl border border-white/10 bg-dark-2/80 p-5 shadow-float backdrop-blur-xl" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary font-mono text-title-md font-medium">
              B+
            </span>
            <div>
              <p className="font-mono text-caption text-on-dark-muted">#RL-2041</p>
              <p className="text-body font-semibold">3 units · National Hospital</p>
            </div>
          </div>
          <span className="rounded-full bg-primary/20 px-2.5 py-1 text-caption font-semibold text-primary-on-dark ring-1 ring-primary-glow/40">
            Critical
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between text-caption text-on-dark-muted">
          <span className="font-semibold tracking-[0.08em] uppercase">Ranked donors</span>
          <span className="flex items-center gap-1">
            <MapPin size={12} /> Colombo
          </span>
        </div>

        <ul className="mt-2 flex flex-col gap-2">
          {PREVIEW_DONORS.map((donor, index) => (
            <li
              key={donor.name}
              className="animate-rise flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5"
              style={{ animationDelay: `${450 + index * 140}ms` }}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-white/10 text-caption font-semibold">
                {donor.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-label font-semibold">
                  {donor.name} <span className="ml-1 font-mono text-caption font-normal text-on-dark-muted">{donor.group}</span>
                </p>
                <p className="text-caption text-on-dark-muted">
                  {donor.reason} · {donor.distance}
                </p>
              </div>
              {donor.status === 'accepted' ? (
                <span className="flex items-center gap-1 rounded-full bg-success/25 px-2 py-0.5 text-caption font-semibold text-on-success-muted">
                  <Check size={12} /> Coming
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-caption font-medium text-on-dark-muted">
                  <BellRing size={12} /> Notified
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-5">
          <div className="flex items-center justify-between text-caption text-on-dark-muted">
            <span>2 of 3 units covered</span>
            <span className="font-mono">67%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/3 rounded-full bg-linear-to-r from-primary to-primary-glow" />
          </div>
        </div>
      </div>

      {/* Floating notification, as a donor would see it */}
      <div className="animate-float absolute -bottom-8 -left-14 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-ink shadow-float">
        <span className="flex size-9 items-center justify-center rounded-xl bg-success-soft text-success">
          <HeartHandshake size={18} />
        </span>
        <div>
          <p className="text-label font-semibold">Kasun accepted</p>
          <p className="text-caption text-text-muted">On the way · 12 min</p>
        </div>
      </div>

      <div className="animate-float absolute -top-6 -right-6 flex items-center gap-2 rounded-xl border border-white/10 bg-ink/90 px-3 py-2 text-caption text-on-dark-muted shadow-float backdrop-blur [animation-delay:-3s]">
        <Timer size={14} className="text-primary-on-dark" />
        Matched in seconds
      </div>
    </div>
  );
}

const FACTS: { value: string; label: string }[] = [
  { value: '8', label: 'blood groups matched by the red cell compatibility table' },
  { value: '90', label: 'days between donations, checked for every donor' },
  { value: '0', label: 'patient details stored or shown to donors' },
  { value: '1 tap', label: 'for a donor to accept and get directions' },
];

function Facts() {
  return (
    <section aria-label="RedLink in numbers" className="border-b border-border bg-surface">
      <dl className="mx-auto grid max-w-[1312px] grid-cols-2 px-4 sm:px-8 lg:grid-cols-4">
        {FACTS.map(({ value, label }, index) => (
          <div
            key={label}
            className={clsx(
              'flex flex-col-reverse gap-1 py-8 pr-4 lg:py-10',
              index > 0 && 'lg:border-l lg:border-border lg:pl-8',
              index % 2 === 1 && 'border-l border-border pl-4 lg:pl-8',
              index >= 2 && 'border-t border-border lg:border-t-0',
            )}
          >
            <dt className="max-w-[220px] text-label text-text-muted">{label}</dt>
            <dd className="font-display text-display-lg text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ClipboardList,
    title: 'A hospital posts a request',
    text: 'Blood group, units, urgency, city and deadline. Only hospitals approved by an admin can post.',
  },
  {
    icon: ListOrdered,
    title: 'RedLink ranks the donors',
    text: 'Every compatible donor who is available and hasn’t given in the last 90 days, best match first: same group, same city, longest since their last donation.',
  },
  {
    icon: BellRing,
    title: 'The best matches are notified',
    text: 'More donors for more units and higher urgency, never a flood. Donors accept or decline, and the hospital sees who is coming.',
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 bg-bg">
      <div className="mx-auto flex max-w-[1312px] flex-col gap-12 px-4 py-24 sm:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="From request to donation, without the phone tree"
          text="Three steps replace an afternoon of phone calls, and every one of them is logged."
        />
        <ol className="relative grid gap-6 md:grid-cols-3">
          {/* Line joining the three step numbers */}
          <span
            className="absolute top-7 right-[16%] left-[16%] hidden h-px bg-linear-to-r from-transparent via-border-strong to-transparent md:block"
            aria-hidden="true"
          />
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li
              key={title}
              className="reveal group relative flex flex-col gap-4 rounded-3xl border border-border bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-white shadow-urgent transition-transform duration-300 group-hover:scale-105">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <span className="font-display text-[56px] leading-none font-bold text-neutral-soft" aria-hidden="true">
                  0{index + 1}
                </span>
              </div>
              <h3 className="text-title-lg text-ink">
                <span className="sr-only">Step {index + 1}: </span>
                {title}
              </h3>
              <p className="text-body text-text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// Pick a patient's group and see which donor groups can give to them; uses the same table as the match filter
function Compatibility() {
  const [recipient, setRecipient] = useState<BloodGroup>('A+');
  const donors = compatibleDonorGroups(recipient);

  return (
    <section id="compatibility" className="scroll-mt-16 border-y border-border bg-surface">
      <div className="mx-auto grid max-w-[1312px] items-center gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
        <div className="flex flex-col gap-6">
          <SectionHeading
            eyebrow="Compatibility"
            title="The right blood, every time"
            text="Matching follows the red cell compatibility table. Exact groups are asked first, so scarce types such as O− are saved for the patients who can only receive O−."
          />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-label font-semibold text-ink">Patient’s blood group</legend>
            <div className="flex flex-wrap gap-2">
              {BLOOD_GROUPS.map((group) => (
                <label key={group} className="cursor-pointer">
                  <input
                    type="radio"
                    name="recipient"
                    value={group}
                    checked={group === recipient}
                    onChange={() => setRecipient(group)}
                    className="peer sr-only"
                  />
                  <span
                    className={clsx(
                      'flex h-10 min-w-12 items-center justify-center rounded-lg border px-3 font-mono text-body font-medium transition-colors duration-150',
                      'border-border bg-surface text-ink hover:border-border-strong hover:bg-bg',
                      'peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:shadow-focus',
                    )}
                  >
                    {formatBloodGroup(group)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="rounded-3xl border border-border bg-bg p-6 sm:p-8">
          <p className="text-label text-text-muted" aria-live="polite">
            A <strong className="font-mono text-ink">{formatBloodGroup(recipient)}</strong> patient can receive from{' '}
            <strong className="text-ink">
              {donors.length} {donors.length === 1 ? 'group' : 'groups'}
            </strong>
          </p>
          <ul className="mt-5 grid grid-cols-4 gap-3">
            {BLOOD_GROUPS.map((group) => {
              const index = donors.indexOf(group);
              const match = index >= 0;
              return (
                <li
                  key={group}
                  className={clsx(
                    'relative flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border transition-all duration-300',
                    match
                      ? 'border-primary bg-primary text-white shadow-urgent'
                      : 'border-border bg-surface text-placeholder',
                  )}
                >
                  <Droplet
                    size={18}
                    className={clsx('transition-opacity', match ? 'fill-white/20 opacity-100' : 'opacity-40')}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-title-md font-medium">{formatBloodGroup(group)}</span>
                  <span className="sr-only">{match ? (index === 0 ? ', exact match' : ', compatible') : ', not compatible'}</span>
                  {index === 0 && (
                    <span className="absolute -top-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase" aria-hidden="true">
                      First
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-5 flex items-center gap-2 text-caption text-text-subtle">
            <span className="inline-block size-2.5 rounded-full bg-primary" aria-hidden="true" />
            Can donate · “First” is asked before the others
          </p>
        </div>
      </div>
    </section>
  );
}

function ForWho() {
  const { user } = useAuth();
  return (
    <section className="bg-bg">
      <div className="mx-auto grid max-w-[1312px] gap-6 px-4 py-24 sm:px-8 lg:grid-cols-2">
        <AudienceCard
          id="donors"
          tone="light"
          icon={HeartHandshake}
          eyebrow="For donors"
          title="Give blood when it matters most"
          points={[
            'Get alerts only for requests your blood group can help',
            'See your eligibility: when you can donate again after 90 days',
            'Accept with one tap, and get directions and the blood bank’s number',
            'Pause alerts while you’re travelling or unwell',
          ]}
          action={
            !user && (
              <LinkButton to="/register/donor" rightIcon={<ArrowRight size={16} aria-hidden="true" />}>
                Become a donor
              </LinkButton>
            )
          }
        />
        <AudienceCard
          id="hospitals"
          tone="dark"
          icon={Building2}
          eyebrow="For hospitals"
          title="Find compatible donors in minutes"
          points={[
            'Post a request and see every matching donor, ranked',
            'The best matches are notified for you, scaled to urgency',
            'Track who accepted, who can’t make it, and call them directly',
            'Registration is reviewed by an admin, usually within 1–2 working days',
          ]}
          action={
            !user && (
              <Link
                to="/register/hospital"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-body font-semibold text-ink no-underline transition-colors hover:bg-neutral-soft hover:text-ink focus-visible:shadow-focus focus-visible:outline-none"
              >
                Register a hospital
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )
          }
        />
      </div>
    </section>
  );
}

interface AudienceCardProps {
  id: string;
  tone: 'light' | 'dark';
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  points: string[];
  action: ReactNode;
}

function AudienceCard({ id, tone, icon: Icon, eyebrow, title, points, action }: AudienceCardProps) {
  const dark = tone === 'dark';
  return (
    <article
      id={id}
      className={clsx(
        'reveal relative isolate flex scroll-mt-20 flex-col gap-6 overflow-hidden rounded-3xl border p-8 sm:p-10',
        dark ? 'border-ink bg-ink text-white' : 'border-border bg-surface',
      )}
    >
      {/* Soft glow in the top corner */}
      <div
        className={clsx(
          'pointer-events-none absolute -top-24 -right-24 -z-10 size-72 rounded-full blur-3xl',
          dark ? 'bg-primary/35' : 'bg-primary-soft',
        )}
        aria-hidden="true"
      />
      <span
        className={clsx(
          'flex size-12 items-center justify-center rounded-2xl',
          dark ? 'bg-white/10 text-primary-on-dark' : 'bg-primary-soft text-primary',
        )}
      >
        <Icon size={24} aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1.5">
        <p className={clsx('text-eyebrow uppercase', dark ? 'text-primary-on-dark' : 'text-primary')}>{eyebrow}</p>
        <h2 className={clsx('font-display text-display-md', dark ? 'text-white' : 'text-ink')}>{title}</h2>
      </div>
      <ul className="flex flex-col gap-3.5">
        {points.map((point) => (
          <li key={point} className={clsx('flex gap-3 text-body', dark ? 'text-on-dark-muted' : 'text-text-muted')}>
            <span
              className={clsx(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                dark ? 'bg-white/10 text-white' : 'bg-success-soft text-success',
              )}
            >
              <Check size={12} className="stroke-[2.5]" aria-hidden="true" />
            </span>
            {point}
          </li>
        ))}
      </ul>
      {action && <div className="mt-auto pt-2">{action}</div>}
    </article>
  );
}

const TRUST_POINTS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ShieldCheck,
    title: 'Verified hospitals only',
    text: 'Every hospital is reviewed by an admin before it can post a request or see a single donor.',
  },
  {
    icon: Timer,
    title: 'Safe for donors',
    text: 'Nobody is asked within 90 days of their last donation, and donors can pause alerts at any time.',
  },
  {
    icon: Lock,
    title: 'Private by design',
    text: 'Donors see the hospital, place and deadline. Nothing about the patient is ever stored or shown.',
  },
];

function Trust() {
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1312px] flex-col gap-12 px-4 py-24 sm:px-8">
        <SectionHeading eyebrow="Built on trust" title="Careful with donors, patients and hospitals" />
        <div className="grid gap-6 md:grid-cols-3">
          {TRUST_POINTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="reveal flex flex-col gap-3 border-l-2 border-primary pl-6">
              <Icon size={22} className="text-primary" aria-hidden="true" />
              <h3 className="text-title-md text-ink">{title}</h3>
              <p className="text-body text-text-muted">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingBand() {
  const { user } = useAuth();
  return (
    <section className="bg-surface px-4 pb-24 sm:px-8">
      <div className="reveal relative isolate mx-auto max-w-[1312px] overflow-hidden rounded-[28px] bg-linear-to-br from-primary via-primary-hover to-ink px-6 py-16 text-center text-white sm:px-12 sm:py-20">
        <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-16 -z-10 size-80 fill-white/[0.06]"
        >
          <path d={DROP_PATH} />
        </svg>
        <h2 className="mx-auto max-w-[720px] font-display text-[32px] leading-[1.1] font-bold tracking-[-0.02em] sm:text-display-lg">
          The next request could be minutes away.
        </h2>
        <p className="mx-auto mt-4 max-w-[520px] text-body-lg text-white/80">
          Sign up once. RedLink only reaches out when your blood group can help and you’re able to give.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {user ? (
            <Link
              to={homePathFor(user.role)}
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-5 text-body-input font-semibold text-ink no-underline transition-colors hover:bg-neutral-soft hover:text-ink focus-visible:shadow-focus focus-visible:outline-none"
            >
              Go to dashboard
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link
                to="/register/donor"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-5 text-body-input font-semibold text-ink no-underline transition-colors hover:bg-neutral-soft hover:text-ink focus-visible:shadow-focus focus-visible:outline-none"
              >
                <Droplet size={18} className="text-primary" aria-hidden="true" />
                Become a donor
              </Link>
              <Link
                to="/register/hospital"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/40 px-5 text-body-input font-semibold text-white no-underline transition-colors hover:bg-white/10 hover:text-white focus-visible:shadow-focus focus-visible:outline-none"
              >
                Register a hospital
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="flex max-w-[680px] flex-col gap-3">
      <p className="flex items-center gap-2 text-eyebrow text-primary uppercase">
        <span className="h-px w-6 bg-primary" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 className="font-display text-[32px] leading-[1.1] font-bold tracking-[-0.02em] text-ink sm:text-display-lg">
        {title}
      </h2>
      {text && <p className="text-body-lg text-text-muted">{text}</p>}
    </div>
  );
}

function SiteFooter() {
  const { user } = useAuth();
  const columns: { title: string; links: { label: string; to: string }[] }[] = [
    {
      title: 'Product',
      links: [
        { label: 'How it works', to: '#how-it-works' },
        { label: 'Compatibility', to: '#compatibility' },
        { label: 'For donors', to: '#donors' },
        { label: 'For hospitals', to: '#hospitals' },
      ],
    },
    {
      title: 'Account',
      links: user
        ? [{ label: 'Dashboard', to: homePathFor(user.role) }]
        : [
            { label: 'Sign in', to: '/login' },
            { label: 'Become a donor', to: '/register/donor' },
            { label: 'Register a hospital', to: '/register/hospital' },
          ],
    },
  ];

  return (
    <footer className="bg-ink text-on-dark-muted">
      <div className="mx-auto grid max-w-[1312px] gap-10 px-4 py-14 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:gap-16">
        <div className="flex max-w-[320px] flex-col gap-4">
          <Link to="/" aria-label="RedLink home" className="self-start">
            <img src="/brand/redlink-logo-reversed.svg" alt="RedLink" className="h-8" />
          </Link>
          <p className="text-label">Blood donor matching for Sri Lanka’s hospitals and the people who give.</p>
        </div>
        {columns.map(({ title, links }) => (
          <nav key={title} aria-label={title} className="flex flex-col gap-3 text-label">
            <p className="text-eyebrow text-white uppercase">{title}</p>
            {/* Section links are plain anchors: the router's Link doesn't scroll to a #hash */}
            {links.map(({ label, to }) =>
              to.startsWith('#') ? (
                <a key={label} href={to} className="text-on-dark-muted no-underline hover:text-white">
                  {label}
                </a>
              ) : (
                <Link key={label} to={to} className="text-on-dark-muted no-underline hover:text-white">
                  {label}
                </Link>
              ),
            )}
          </nav>
        ))}
        <div className="flex flex-col gap-3 text-label">
          <p className="text-eyebrow text-white uppercase">Contact</p>
          <a href="mailto:admin@redlink.lk" className="text-on-dark-muted no-underline hover:text-white">
            admin@redlink.lk
          </a>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-[1312px] px-4 py-6 text-caption sm:px-8">© {new Date().getFullYear()} RedLink</p>
      </div>
    </footer>
  );
}
