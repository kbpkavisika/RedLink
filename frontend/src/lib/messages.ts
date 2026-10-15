import type { TFunction } from 'i18next';
import type { Translation } from '../locales/en';

/**
 * Form rules (zod) are built once, outside React, so they can't call t(). They hold a translation key instead,
 * and the input that shows the error translates it with translateMessage:
 *   msg('enterEmail')       → "validation.enterEmail"
 *   msg('tooLong', 150)     → "validation.tooLong|150"   → "Use at most 150 characters"
 * Anything else, such as a message from the server, is shown as it is.
 */
export function msg(key: keyof Translation['validation'], max?: number): string {
  return max === undefined ? `validation.${key}` : `validation.${key}|${max}`;
}

export function translateMessage(t: TFunction, message: string | undefined): string | undefined {
  if (!message?.startsWith('validation.')) return message;
  const [key, max] = message.split('|');
  // The key is checked at runtime: these strings are built, so TypeScript can't check them
  return max === undefined ? t(key as never) : t(key as never, { max: Number(max) });
}
