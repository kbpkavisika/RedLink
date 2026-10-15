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
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { ChatWidget } from '../components/chat/ChatWidget';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';
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
 *   signed in  → Dashboard (their role's home), in the hero, the closing band and the profile menu,
 *                plus the AI assistant's chat button
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
      {/* Signed-in users only; renders nothing for visitors */}
      <ChatWidget />
    </div>
  );
}

// Dashboard or sign-in buttons, depending on who is looking. Nothing while a saved session is being checked.
function AccountActions() {
  const { t } = useTranslation();
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
        {t('common.signIn')}
      </Link>
      <LinkButton to="/register/donor" className="hidden sm:inline-flex">
        {t('auth.login.donorTitle')}
      </LinkButton>
    </div>
  );
}

const NAV_LINKS = [
  { href: '#how-it-works', label: 'howItWorks' },
  { href: '#compatibility', label: 'compatibility' },
  { href: '#donors', label: 'donors' },
  { href: '#hospitals', label: 'hospitals' },
] as const;

function SiteHeader() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-surface/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-[1312px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link to="/" aria-label={t('common.homeLink')}>
          <img src="/brand/redlink-logo.svg" alt="RedLink" className="h-8" />
        </Link>
        <nav aria-label={t('home.siteNav')} className="hidden items-center gap-1 text-label font-medium md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-text-muted no-underline transition-colors hover:bg-bg hover:text-ink"
            >
              {t(`home.nav.${label}`)}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-3">
          <LanguageSwitcher />
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

const HERO_POINTS = ['verified', 'safety', 'privacy'] as const;

function Hero() {
  const { t } = useTranslation();
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
            {t('home.tagline')}
          </p>

          <h1
            className="animate-rise max-w-[680px] font-display text-[40px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[56px] lg:text-[64px]"
            style={{ animationDelay: '80ms' }}
          >
            <Trans i18nKey="home.heroTitle" components={{ red: <span className="text-gradient-red" /> }} />
          </h1>

          <p className="animate-rise max-w-[540px] text-body-lg text-on-dark-muted sm:text-[18px] sm:leading-7" style={{ animationDelay: '160ms' }}>
            {t('home.heroBody')}
          </p>

          <div className="animate-rise flex flex-wrap items-center gap-3" style={{ animationDelay: '240ms' }}>
            {user ? (
              <LinkButton
                to={homePathFor(user.role)}
                size="lg"
                className="shadow-glow"
                rightIcon={<ArrowRight size={18} aria-hidden="true" />}
              >
                {t('home.goToDashboard')}
              </LinkButton>
            ) : (
              <>
                <LinkButton
                  to="/register/donor"
                  size="lg"
                  className="shadow-glow"
                  leftIcon={<Droplet size={18} aria-hidden="true" />}
                >
                  {t('auth.login.donorTitle')}
                </LinkButton>
                <Link
                  to="/register/hospital"
                  className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-5 text-body-input font-semibold text-white no-underline backdrop-blur transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white focus-visible:shadow-focus focus-visible:outline-none"
                >
                  <Building2 size={18} aria-hidden="true" />
                  {t('auth.login.hospitalTitle')}
                </Link>
              </>
            )}
          </div>

          <ul
            className="animate-rise flex flex-wrap gap-x-6 gap-y-2 text-label text-on-dark-muted"
            style={{ animationDelay: '320ms' }}
          >
            {HERO_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-primary-on-dark" aria-hidden="true" />
                {t(`home.heroPoints.${point}`)}
              </li>
            ))}
          </ul>

          {!user && (
            <p className="animate-rise text-label text-on-dark-muted" style={{ animationDelay: '400ms' }}>
              <Trans
                i18nKey="home.alreadyRegistered"
                components={{
                  link: (
                    <Link to="/login" className="font-semibold text-white underline-offset-4 hover:text-white hover:underline" />
                  ),
                }}
              />
            </p>
          )}
        </div>

        <MatchPreview />
      </div>
    </section>
  );
}

const PREVIEW_DONORS = [
  { initials: 'KP', name: 'Kasun P.', group: 'B+', reason: 'exactSameCity', days: 0, distance: '1.2 km', status: 'accepted' },
  { initials: 'DR', name: 'Dilini R.', group: 'B+', reason: 'exactDays', days: 214, distance: '3.4 km', status: 'accepted' },
  { initials: 'AF', name: 'Ashan F.', group: 'O+', reason: 'compatibleSameCity', days: 0, distance: '2.0 km', status: 'notified' },
  { initials: 'NW', name: 'Nadeesha W.', group: 'O−', reason: 'compatibleDays', days: 180, distance: '5.8 km', status: 'notified' },
] as const;

// An illustration of a request being matched; decorative, so hidden from screen readers
function MatchPreview() {
  const { t } = useTranslation();
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
              <p className="text-body font-semibold">{t('home.preview.request')}</p>
            </div>
          </div>
          <span className="rounded-full bg-primary/20 px-2.5 py-1 text-caption font-semibold text-primary-on-dark ring-1 ring-primary-glow/40">
            {t('status.urgency.CRITICAL')}
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between text-caption text-on-dark-muted">
          <span className="font-semibold tracking-[0.08em] uppercase">{t('home.preview.ranked')}</span>
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
                  {t(`home.preview.${donor.reason}`, { days: donor.days })} · {donor.distance}
                </p>
              </div>
              {donor.status === 'accepted' ? (
                <span className="flex items-center gap-1 rounded-full bg-success/25 px-2 py-0.5 text-caption font-semibold text-on-success-muted">
                  <Check size={12} /> {t('status.reply.ACCEPTED')}
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-caption font-medium text-on-dark-muted">
                  <BellRing size={12} /> {t('home.preview.notified')}
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-5">
          <div className="flex items-center justify-between text-caption text-on-dark-muted">
            <span>{t('home.preview.covered')}</span>
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
          <p className="text-label font-semibold">{t('home.preview.accepted', { name: 'Kasun' })}</p>
          <p className="text-caption text-text-muted">{t('home.preview.onTheWay')}</p>
        </div>
      </div>

      <div className="animate-float absolute -top-6 -right-6 flex items-center gap-2 rounded-xl border border-white/10 bg-ink/90 px-3 py-2 text-caption text-on-dark-muted shadow-float backdrop-blur [animation-delay:-3s]">
        <Timer size={14} className="text-primary-on-dark" />
        {t('home.preview.matched')}
      </div>
    </div>
  );
}

const FACTS = ['groups', 'days', 'patients', 'tap'] as const;

function Facts() {
  const { t } = useTranslation();
  return (
    <section aria-label={t('home.facts.label')} className="border-b border-border bg-surface">
      <dl className="mx-auto grid max-w-[1312px] grid-cols-2 px-4 sm:px-8 lg:grid-cols-4">
        {FACTS.map((fact, index) => (
          <div
            key={fact}
            className={clsx(
              'flex flex-col-reverse gap-1 py-8 pr-4 lg:py-10',
              index > 0 && 'lg:border-l lg:border-border lg:pl-8',
              index % 2 === 1 && 'border-l border-border pl-4 lg:pl-8',
              index >= 2 && 'border-t border-border lg:border-t-0',
            )}
          >
            <dt className="max-w-[220px] text-label text-text-muted">{t(`home.facts.${fact}.label`)}</dt>
            <dd className="font-display text-display-lg text-ink">{t(`home.facts.${fact}.value`)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const STEPS: { icon: LucideIcon; key: 'post' | 'rank' | 'notify' }[] = [
  { icon: ClipboardList, key: 'post' },
  { icon: ListOrdered, key: 'rank' },
  { icon: BellRing, key: 'notify' },
];

function HowItWorks() {
  const { t } = useTranslation();
  return (
    <section id="how-it-works" className="scroll-mt-16 bg-bg">
      <div className="mx-auto flex max-w-[1312px] flex-col gap-12 px-4 py-24 sm:px-8">
        <SectionHeading eyebrow={t('home.how.eyebrow')} title={t('home.how.title')} text={t('home.how.text')} />
        <ol className="relative grid gap-6 md:grid-cols-3">
          {/* Line joining the three step numbers */}
          <span
            className="absolute top-7 right-[16%] left-[16%] hidden h-px bg-linear-to-r from-transparent via-border-strong to-transparent md:block"
            aria-hidden="true"
          />
          {STEPS.map(({ icon: Icon, key }, index) => (
            <li
              key={key}
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
                <span className="sr-only">{t('home.how.stepLabel', { n: index + 1 })}</span>
                {t(`home.how.steps.${key}.title`)}
              </h3>
              <p className="text-body text-text-muted">{t(`home.how.steps.${key}.text`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// Pick a patient's group and see which donor groups can give to them; uses the same table as the match filter
function Compatibility() {
  const { t } = useTranslation();
  const [recipient, setRecipient] = useState<BloodGroup>('A+');
  const donors = compatibleDonorGroups(recipient);

  return (
    <section id="compatibility" className="scroll-mt-16 border-y border-border bg-surface">
      <div className="mx-auto grid max-w-[1312px] items-center gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
        <div className="flex flex-col gap-6">
          <SectionHeading eyebrow={t('home.compat.eyebrow')} title={t('home.compat.title')} text={t('home.compat.text')} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-label font-semibold text-ink">{t('home.compat.patientGroup')}</legend>
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
            <Trans
              i18nKey="home.compat.canReceive"
              count={donors.length}
              values={{ group: formatBloodGroup(recipient) }}
              components={{ code: <strong className="font-mono text-ink" />, b: <strong className="text-ink" /> }}
            />
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
                  <span className="sr-only">
                    {match
                      ? index === 0
                        ? t('home.compat.exact')
                        : t('home.compat.compatible')
                      : t('home.compat.notCompatible')}
                  </span>
                  {index === 0 && (
                    <span className="absolute -top-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase" aria-hidden="true">
                      {t('home.compat.first')}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-5 flex items-center gap-2 text-caption text-text-subtle">
            <span className="inline-block size-2.5 rounded-full bg-primary" aria-hidden="true" />
            {t('home.compat.legend')}
          </p>
        </div>
      </div>
    </section>
  );
}

const AUDIENCE_POINTS = ['p1', 'p2', 'p3', 'p4'] as const;

function ForWho() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <section className="bg-bg">
      <div className="mx-auto grid max-w-[1312px] gap-6 px-4 py-24 sm:px-8 lg:grid-cols-2">
        <AudienceCard
          id="donors"
          tone="light"
          icon={HeartHandshake}
          eyebrow={t('home.forDonors.eyebrow')}
          title={t('home.forDonors.title')}
          points={AUDIENCE_POINTS.map((point) => t(`home.forDonors.${point}`))}
          action={
            !user && (
              <LinkButton to="/register/donor" rightIcon={<ArrowRight size={16} aria-hidden="true" />}>
                {t('auth.login.donorTitle')}
              </LinkButton>
            )
          }
        />
        <AudienceCard
          id="hospitals"
          tone="dark"
          icon={Building2}
          eyebrow={t('home.forHospitals.eyebrow')}
          title={t('home.forHospitals.title')}
          points={AUDIENCE_POINTS.map((point) => t(`home.forHospitals.${point}`))}
          action={
            !user && (
              <Link
                to="/register/hospital"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-body font-semibold text-ink no-underline transition-colors hover:bg-neutral-soft hover:text-ink focus-visible:shadow-focus focus-visible:outline-none"
              >
                {t('auth.login.hospitalTitle')}
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

const TRUST_POINTS: { icon: LucideIcon; key: 'verified' | 'safe' | 'private' }[] = [
  { icon: ShieldCheck, key: 'verified' },
  { icon: Timer, key: 'safe' },
  { icon: Lock, key: 'private' },
];

function Trust() {
  const { t } = useTranslation();
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1312px] flex-col gap-12 px-4 py-24 sm:px-8">
        <SectionHeading eyebrow={t('home.trust.eyebrow')} title={t('home.trust.title')} />
        <div className="grid gap-6 md:grid-cols-3">
          {TRUST_POINTS.map(({ icon: Icon, key }) => (
            <div key={key} className="reveal flex flex-col gap-3 border-l-2 border-primary pl-6">
              <Icon size={22} className="text-primary" aria-hidden="true" />
              <h3 className="text-title-md text-ink">{t(`home.trust.${key}.title`)}</h3>
              <p className="text-body text-text-muted">{t(`home.trust.${key}.text`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingBand() {
  const { t } = useTranslation();
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
          {t('home.closing.title')}
        </h2>
        <p className="mx-auto mt-4 max-w-[520px] text-body-lg text-white/80">{t('home.closing.body')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {user ? (
            <Link
              to={homePathFor(user.role)}
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-5 text-body-input font-semibold text-ink no-underline transition-colors hover:bg-neutral-soft hover:text-ink focus-visible:shadow-focus focus-visible:outline-none"
            >
              {t('home.goToDashboard')}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link
                to="/register/donor"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-5 text-body-input font-semibold text-ink no-underline transition-colors hover:bg-neutral-soft hover:text-ink focus-visible:shadow-focus focus-visible:outline-none"
              >
                <Droplet size={18} className="text-primary" aria-hidden="true" />
                {t('auth.login.donorTitle')}
              </Link>
              <Link
                to="/register/hospital"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/40 px-5 text-body-input font-semibold text-white no-underline transition-colors hover:bg-white/10 hover:text-white focus-visible:shadow-focus focus-visible:outline-none"
              >
                {t('auth.login.hospitalTitle')}
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const columns: { title: string; links: { label: string; to: string }[] }[] = [
    {
      title: t('home.footer.product'),
      links: [
        { label: t('home.nav.howItWorks'), to: '#how-it-works' },
        { label: t('home.nav.compatibility'), to: '#compatibility' },
        { label: t('home.forDonors.eyebrow'), to: '#donors' },
        { label: t('home.forHospitals.eyebrow'), to: '#hospitals' },
      ],
    },
    {
      title: t('home.footer.account'),
      links: user
        ? [{ label: t('common.dashboard'), to: homePathFor(user.role) }]
        : [
            { label: t('common.signIn'), to: '/login' },
            { label: t('auth.login.donorTitle'), to: '/register/donor' },
            { label: t('auth.login.hospitalTitle'), to: '/register/hospital' },
          ],
    },
  ];

  return (
    <footer className="bg-ink text-on-dark-muted">
      <div className="mx-auto grid max-w-[1312px] gap-10 px-4 py-14 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:gap-16">
        <div className="flex max-w-[320px] flex-col gap-4">
          <Link to="/" aria-label={t('common.homeLink')} className="self-start">
            <img src="/brand/redlink-logo-reversed.svg" alt="RedLink" className="h-8" />
          </Link>
          <p className="text-label">{t('home.footer.tagline')}</p>
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
          <p className="text-eyebrow text-white uppercase">{t('home.footer.contact')}</p>
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
