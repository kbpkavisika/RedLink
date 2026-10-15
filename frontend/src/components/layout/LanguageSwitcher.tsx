import clsx from 'clsx';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { currentLanguage, LANGUAGES, type Language } from '../../i18n';

/**
 * "EN ▾" in the top bar, home page header and sign-in pages: English, සිංහල, தமிழ்.
 * The choice is remembered in this browser (i18n.ts). Each name is written in its own language and marked
 * with lang, so a screen reader reads it correctly whatever the page's language is.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((language) => language.code === currentLanguage())!;

  // Close on a click outside or on Escape, like the user menu
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

  const choose = (code: Language) => {
    setOpen(false);
    void i18n.changeLanguage(code);
  };

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${t('language.choose')}: ${current.name}`}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 items-center gap-1.5 rounded-md px-2 text-label font-semibold text-text-muted hover:bg-bg hover:text-ink focus-visible:shadow-focus focus-visible:outline-none"
      >
        <Languages size={18} aria-hidden="true" />
        <span lang={current.code}>{current.short}</span>
        <ChevronDown size={14} aria-hidden="true" className={clsx('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul
          id={menuId}
          role="menu"
          aria-label={t('language.label')}
          className="absolute top-full right-0 z-30 mt-2 w-44 rounded-xl border border-border bg-surface p-1.5"
        >
          {LANGUAGES.map((language) => {
            const selected = language.code === current.code;
            return (
              <li key={language.code} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  lang={language.code}
                  onClick={() => choose(language.code)}
                  className={clsx(
                    'flex h-10 w-full items-center justify-between gap-2 rounded-md px-3 text-body hover:bg-bg focus-visible:shadow-focus focus-visible:outline-none',
                    selected ? 'font-semibold text-ink' : 'text-text-muted',
                  )}
                >
                  {language.name}
                  {selected && <Check size={16} className="text-primary" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
