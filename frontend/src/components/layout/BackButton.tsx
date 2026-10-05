import clsx from 'clsx';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface BackButtonProps {
  // Where to go when there is no earlier page in this tab (e.g. a link opened in a new tab)
  fallback: string;
  // For dark backgrounds, such as the sign-in hero
  onDark?: boolean;
  className?: string;
}

/**
 * The back arrow on every page: goes to the previous page, like the browser's back button.
 * When this tab has no earlier RedLink page, it goes to `fallback` instead of leaving the site.
 */
export function BackButton({ fallback, onDark = false, className }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // React Router gives the first page of a tab the key "default"
  const hasHistory = location.key !== 'default';

  return (
    <button
      type="button"
      aria-label="Go back"
      title="Go back"
      onClick={() => (hasHistory ? navigate(-1) : navigate(fallback))}
      className={clsx(
        'flex size-10 shrink-0 items-center justify-center rounded-md focus-visible:shadow-focus focus-visible:outline-none',
        onDark ? 'text-white hover:bg-white/10' : 'text-text-muted hover:bg-bg hover:text-ink',
        className,
      )}
    >
      <ArrowLeft size={20} aria-hidden="true" />
    </button>
  );
}
