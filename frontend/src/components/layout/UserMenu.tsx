import clsx from 'clsx';
import { ChevronDown, KeyRound, LayoutDashboard, LogOut } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { homePathFor, roleLabel } from '../../lib/roles';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

const itemClass =
  'flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-body font-medium text-ink no-underline hover:bg-bg hover:text-ink focus-visible:shadow-focus focus-visible:outline-none';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on a click outside or on Escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 items-center gap-2 rounded-md pr-2 pl-1 hover:bg-bg focus-visible:shadow-focus focus-visible:outline-none"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-caption font-semibold text-primary-hover">
          {initials(user.fullName)}
        </span>
        <span className="hidden text-label font-medium text-ink sm:inline">{user.fullName}</span>
        <ChevronDown size={16} aria-hidden="true" className={clsx('text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute top-full right-0 z-30 mt-2 w-64 rounded-xl border border-border bg-surface p-1.5"
        >
          <div className="border-b border-border px-3 pt-2 pb-3">
            <p className="text-body font-semibold text-ink">{user.fullName}</p>
            <p className="truncate text-caption text-text-subtle">{user.email}</p>
            <p className="mt-1 text-caption text-text-subtle">{roleLabel(user.role)}</p>
          </div>
          <div className="pt-1.5">
            <Link to={homePathFor(user.role)} className={itemClass} onClick={() => setOpen(false)}>
              <LayoutDashboard size={16} aria-hidden="true" />
              Dashboard
            </Link>
            <Link to="/change-password" className={itemClass} onClick={() => setOpen(false)}>
              <KeyRound size={16} aria-hidden="true" />
              Change password
            </Link>
            <button type="button" className={itemClass} onClick={logout}>
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
