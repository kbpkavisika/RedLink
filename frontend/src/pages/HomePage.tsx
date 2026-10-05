import {
  ArrowRight,
  BellRing,
  Building2,
  Check,
  ClipboardList,
  Droplet,
  HeartHandshake,
  ListOrdered,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { UserMenu } from '../components/layout/UserMenu';
import { LinkButton } from '../components/ui';
import { homePathFor } from '../lib/roles';

/**
 * "/": the public home page. Everyone sees it, signed in or not; only the buttons change.
 *   signed out → Sign in · Become a donor · Register a hospital
 *   signed in  → Go to dashboard (their role's home)
 * The dashboards themselves stay behind RequireAuth.
 */
export function HomePage() {
  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <ForWho />
        <Trust />
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
  if (user) {
    return (
      <LinkButton to={homePathFor(user.role)} rightIcon={<ArrowRight size={16} aria-hidden="true" />}>
        Go to dashboard
      </LinkButton>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        to="/login"
        className="inline-flex h-10 items-center rounded-md px-4 text-body font-semibold text-ink no-underline hover:bg-bg"
      >
        Sign in
      </Link>
      <LinkButton to="/register/donor">Become a donor</LinkButton>
    </div>
  );
}

function SiteHeader() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1312px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link to="/" aria-label="RedLink home">
          <img src="/brand/redlink-logo.svg" alt="RedLink" className="h-8" />
        </Link>
        <nav aria-label="Site" className="hidden items-center gap-6 text-label font-medium md:flex">
          <a href="#how-it-works" className="text-text-muted no-underline hover:text-ink">
            About
          </a>
          <a href="#donors" className="text-text-muted no-underline hover:text-ink">
            Donors
          </a>
          <a href="#hospitals" className="text-text-muted no-underline hover:text-ink">
            Hospitals
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <AccountActions />
          {user && <UserMenu />}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { user } = useAuth();
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      {/* Large blood drop bleeding off the right edge, as on the sign-in page */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -bottom-48 h-[560px] w-[560px] fill-dark-2"
      >
        <path d="M12 2.5c-.3 0-.6.2-.8.4C9.6 5 5 11 5 14.8 5 18.8 8.1 22 12 22s7-3.2 7-7.2C19 11 14.4 5 12.8 2.9c-.2-.2-.5-.4-.8-.4Z" />
      </svg>

      <div className="relative mx-auto flex max-w-[1312px] flex-col gap-8 px-4 py-20 sm:px-8 lg:py-28">
        <p className="text-eyebrow text-primary-on-dark uppercase">Blood donor matching for Sri Lanka</p>
        <h1 className="max-w-[720px] font-display text-display-xl">Stop calling donors one by one.</h1>
        <p className="max-w-[560px] text-body-lg text-on-dark-muted">
          A hospital posts what it needs. RedLink ranks every compatible, eligible donor nearby, notifies the best
          matches, and shows who is coming.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {user ? (
            <LinkButton to={homePathFor(user.role)} size="lg" rightIcon={<ArrowRight size={18} aria-hidden="true" />}>
              Go to dashboard
            </LinkButton>
          ) : (
            <>
              <LinkButton to="/register/donor" size="lg" leftIcon={<Droplet size={18} aria-hidden="true" />}>
                Become a donor
              </LinkButton>
              <Link
                to="/register/hospital"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/40 px-5 text-body-input font-semibold text-white no-underline hover:bg-white/10 focus-visible:shadow-focus focus-visible:outline-none"
              >
                <Building2 size={18} aria-hidden="true" />
                Register a hospital
              </Link>
              <Link to="/login" className="px-2 text-body font-semibold text-white underline-offset-4 hover:underline">
                Already registered? Sign in
              </Link>
            </>
          )}
        </div>
        <p className="flex items-center gap-2 text-label text-on-dark-muted">
          <ShieldCheck size={18} className="text-primary-on-dark" aria-hidden="true" />
          Patient details never leave the hospital
        </p>
      </div>
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
    <section id="how-it-works" className="scroll-mt-16 border-b border-border bg-bg">
      <div className="mx-auto flex max-w-[1312px] flex-col gap-10 px-4 py-20 sm:px-8">
        <SectionHeading eyebrow="How it works" title="From request to donation, without the phone tree" />
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="font-mono text-caption text-text-subtle">Step {index + 1}</span>
              </div>
              <h3 className="text-title-md text-ink">{title}</h3>
              <p className="text-body text-text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ForWho() {
  const { user } = useAuth();
  return (
    <section className="mx-auto grid max-w-[1312px] gap-6 px-4 py-20 sm:px-8 lg:grid-cols-2">
      <AudienceCard
        id="donors"
        icon={HeartHandshake}
        eyebrow="For donors"
        title="Give blood when it matters most"
        points={[
          'Get alerts only for requests your blood group can help',
          'See your eligibility: when you can donate again after 90 days',
          'Accept with one tap, and get directions and the blood bank’s number',
          'Pause alerts while you’re travelling or unwell',
        ]}
        action={!user && <LinkButton to="/register/donor">Become a donor</LinkButton>}
      />
      <AudienceCard
        id="hospitals"
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
            <LinkButton to="/register/hospital" variant="dark">
              Register a hospital
            </LinkButton>
          )
        }
      />
    </section>
  );
}

interface AudienceCardProps {
  id: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  points: string[];
  action: ReactNode;
}

function AudienceCard({ id, icon: Icon, eyebrow, title, points, action }: AudienceCardProps) {
  return (
    <article id={id} className="flex scroll-mt-20 flex-col gap-5 rounded-2xl border border-border bg-surface p-8">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Icon size={24} aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-eyebrow text-primary uppercase">{eyebrow}</p>
        <h2 className="font-display text-display-sm text-ink">{title}</h2>
      </div>
      <ul className="flex flex-col gap-3">
        {points.map((point) => (
          <li key={point} className="flex gap-3 text-body text-text-muted">
            <Check size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
      {action && <div className="mt-auto pt-2">{action}</div>}
    </article>
  );
}

function Trust() {
  return (
    <section className="border-t border-border bg-bg">
      <div className="mx-auto grid max-w-[1312px] gap-6 px-4 py-16 sm:px-8 md:grid-cols-3">
        <TrustPoint
          title="Compatible, every time"
          text="Matching follows the red cell compatibility table, with exact groups first to save scarce types such as O−."
        />
        <TrustPoint
          title="Safe for donors"
          text="Nobody is asked within 90 days of their last donation, and donors can pause alerts at any time."
        />
        <TrustPoint
          title="Private by design"
          text="Donors see the hospital, place and deadline. Nothing about the patient is ever stored or shown."
        />
      </div>
    </section>
  );
}

function TrustPoint({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-2 text-title-md text-ink">
        <ShieldCheck size={18} className="text-success" aria-hidden="true" />
        {title}
      </h3>
      <p className="text-body text-text-muted">{text}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-eyebrow text-primary uppercase">{eyebrow}</p>
      <h2 className="max-w-[640px] font-display text-display-lg text-ink">{title}</h2>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="bg-ink text-on-dark-muted">
      <div className="mx-auto flex max-w-[1312px] flex-wrap items-center justify-between gap-4 px-4 py-8 text-label sm:px-8">
        <Link to="/" aria-label="RedLink home">
          <img src="/brand/redlink-logo-reversed.svg" alt="RedLink" className="h-7" />
        </Link>
        <p>
          Questions? <a href="mailto:admin@redlink.lk" className="text-white">admin@redlink.lk</a>
        </p>
        <p>© {new Date().getFullYear()} RedLink</p>
      </div>
    </footer>
  );
}
