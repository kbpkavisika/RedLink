import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import i18n, { LANGUAGE_STORAGE_KEY } from './i18n';
import { formatDate } from './lib/format';
import { msg, translateMessage } from './lib/messages';
import { timeAgo } from './lib/notifications';
import { en } from './locales/en';
import { si } from './locales/si';
import { ta } from './locales/ta';
import { LoginPage } from './pages/LoginPage';
import { renderWithAuth } from './test/renderWithAuth';

// Every key as "a.b.c" with its text
function flatten(tree: object, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((all, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? { ...all, [path]: value } : { ...all, ...flatten(value as object, path) };
  }, {});
}

// What the app fills in or wraps: {{name}} and <b>…</b> must survive translation
function markers(text: string): string[] {
  return [...text.matchAll(/\{\{\w+\}\}|<\/?\w+>/g)].map(([marker]) => marker).sort();
}

describe('translations', () => {
  const english = flatten(en);

  it.each([
    ['Sinhala', si],
    ['Tamil', ta],
  ])('%s has every key, none empty, with the same placeholders and tags as English', (_name, translation) => {
    const other = flatten(translation);
    expect(Object.keys(other).sort()).toEqual(Object.keys(english).sort());
    for (const [key, text] of Object.entries(other)) {
      expect(text.trim(), key).not.toBe('');
      expect(markers(text), key).toEqual(markers(english[key]));
    }
  });
});

describe('language switching', () => {
  // The sign-in page has the switcher in its layout
  it('switches the whole page and remembers the choice', async () => {
    renderWithAuth(<LoginPage />);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Choose language/ }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'සිංහල' }));

    expect(screen.getByRole('heading', { name: 'පුරනය වන්න' })).toBeInTheDocument();
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('si');
    expect(document.documentElement.lang).toBe('si');
  });

  it('shows form errors in the chosen language', async () => {
    await i18n.changeLanguage('ta');
    renderWithAuth(<LoginPage />);

    await userEvent.click(screen.getByRole('button', { name: 'உள்நுழை' }));

    expect(await screen.findByText('உங்கள் மின்னஞ்சலை உள்ளிடவும்')).toBeInTheDocument();
  });

  it('uses a key without plural forms for any count', async () => {
    expect(i18n.t('hospital.summary.donated', { count: 1 })).toBe('1 donated');
    await i18n.changeLanguage('si');
    expect(i18n.t('hospital.summary.donated', { count: 3 })).toBe('3ක් දන් දුන්නා');
    expect(i18n.t('common.unit', { count: 2 })).toBe('ඒකක 2');
  });

  it('leaves messages from the server as they are', () => {
    expect(translateMessage(i18n.t, 'Email or password is incorrect.')).toBe('Email or password is incorrect.');
    expect(translateMessage(i18n.t, msg('tooLong', 150))).toBe('Use at most 150 characters');
  });
});

describe('dates and times', () => {
  it('follow the chosen language', async () => {
    expect(formatDate('2026-05-01')).toBe('1 May 2026');

    await i18n.changeLanguage('si');
    expect(formatDate('2026-05-01')).not.toBe('1 May 2026');
    expect(formatDate('2026-05-01')).toContain('2026');

    await i18n.changeLanguage('ta');
    const now = Date.parse('2026-10-06T12:00:00Z');
    expect(timeAgo('2026-10-04T12:00:00Z', now)).toBe('2 நாட்கள் முன்');
  });
});
