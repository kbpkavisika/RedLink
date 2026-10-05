import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BackButton } from './BackButton';

// Simple centred layout for pages outside the app shell (forgot password, 404), with a back arrow
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-[440px] flex-col gap-6">
        <div className="relative flex items-center justify-center">
          <BackButton fallback="/" className="absolute left-0" />
          <Link to="/" aria-label="RedLink home">
            <img src="/brand/redlink-logo.svg" alt="RedLink" className="h-8" />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}