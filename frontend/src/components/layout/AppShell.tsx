import clsx from 'clsx';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { Button } from '../ui';
import { navigation, pageTitleFor } from './navigation';
import { homePathFor } from '../../lib/roles';
import { BackButton } from './BackButton';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';

/**
 * Layout for every signed-in page (design.md §6.2):
 * 240px sidebar with the role's links, top bar with page title and actions, content on the page background.
 * Below 1024px the sidebar becomes a slide-out menu.
 */
export function AppShell() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Escape closes the mobile menu
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  if (!user) return null; // RequireAuth guarantees a user; this keeps TypeScript happy

  const title = pageTitleFor(pathname, user.role);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      {/* Dimmed backdrop behind the mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" aria-hidden="true" onClick={() => setMenuOpen(false)} />
      )}

      <aside
        id="app-sidebar"
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-surface transition-transform duration-200',
          'lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/" aria-label="RedLink home" onClick={() => setMenuOpen(false)}>
            <img src="/brand/redlink-logo.svg" alt="RedLink" className="h-7" />
          </Link>
          <Button variant="icon" aria-label="Close menu" className="lg:hidden" onClick={() => setMenuOpen(false)}>
            <X size={18} aria-hidden="true" />
          </Button>
        </div>

        <nav aria-label="Main" className="flex flex-col gap-1 px-3 py-2">
          {navigation[user.role].map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex h-10 items-center gap-3 rounded-md px-3 text-body font-medium no-underline',
                  'focus-visible:shadow-focus focus-visible:outline-none',
                  isActive
                    ? 'bg-primary-soft text-primary-hover hover:text-primary-hover'
                    : 'text-text-muted hover:bg-bg hover:text-ink',
                )
              }
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface px-4 sm:px-8">
          <Button
            variant="icon"
            aria-label="Open menu"
            aria-controls="app-sidebar"
            aria-expanded={menuOpen}
            className="lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={18} aria-hidden="true" />
          </Button>

          {/* Back to the previous page; with none in this tab, a page goes to its dashboard and a dashboard to the home page */}
          <BackButton fallback={pathname === homePathFor(user.role) ? '/' : homePathFor(user.role)} />

          <h1 className="min-w-0 flex-1 truncate text-title-md text-ink">{title}</h1>


          <NotificationBell />
          <UserMenu />
        </header>

        <main className="mx-auto w-full max-w-[1312px] flex-1 px-4 py-6 sm:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
