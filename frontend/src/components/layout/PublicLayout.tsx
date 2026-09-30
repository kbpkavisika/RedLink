import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// Simple centred layout for pages outside the app shell (sign-in placeholder, forgot password, 404)
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-[440px] flex-col gap-6">
        <Link to="/" aria-label="RedLink home" className="self-center">
          <img src="/brand/redlink-logo.svg" alt="RedLink" className="h-8" />
        </Link>
        {children}
      </div>
    </div>
  );
}
