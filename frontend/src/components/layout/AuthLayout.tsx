import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Sign-in and registration (design.md §6.1): a 640px dark hero on the left and the form column on the right.
 * Below 1024px the hero is hidden and a slim logo header sits above the form instead.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[640px_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <Link to="/" aria-label="RedLink home" className="relative self-start">
          <img src="/brand/redlink-logo-reversed.svg" alt="RedLink" className="h-8" />
        </Link>

        <div className="relative flex max-w-[440px] flex-col gap-4">
          <h2 className="font-display text-display-xl">Stop calling donors one by one.</h2>
          <p className="text-body-lg text-on-dark-muted">
            Post a request and RedLink ranks every compatible, eligible donor nearby — then notifies them for you.
          </p>
        </div>

        <p className="relative flex items-center gap-2 text-label text-on-dark-muted">
          <ShieldCheck size={18} strokeWidth={1.75} className="text-primary-on-dark" aria-hidden="true" />
          Patient details never leave the hospital
        </p>

        {/* Large blood drop bleeding off the bottom-right corner */}
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -bottom-40 h-[520px] w-[520px] fill-dark-2"
        >
          <path d="M12 2.5c-.3 0-.6.2-.8.4C9.6 5 5 11 5 14.8 5 18.8 8.1 22 12 22s7-3.2 7-7.2C19 11 14.4 5 12.8 2.9c-.2-.2-.5-.4-.8-.4Z" />
        </svg>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="flex w-full max-w-[400px] flex-col gap-8">
          <Link to="/" aria-label="RedLink home" className="self-start lg:hidden">
            <img src="/brand/redlink-logo.svg" alt="RedLink" className="h-8" />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
