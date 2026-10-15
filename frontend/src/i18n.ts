import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { si } from './locales/si';
import { ta } from './locales/ta';

// The languages RedLink speaks. locale is what dates are formatted with (Intl).
export const LANGUAGES = [
  { code: 'en', name: 'English', short: 'EN', locale: 'en-GB' },
  { code: 'si', name: 'සිංහල', short: 'සිං', locale: 'si-LK' },
  { code: 'ta', name: 'தமிழ்', short: 'த', locale: 'ta-LK' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

// Where the chosen language is remembered (this browser only)
export const LANGUAGE_STORAGE_KEY = 'redlink.language';

/**
 * i18next setup (README "Languages"). All three languages are bundled, so the first render is already translated.
 * The language is the one chosen before (localStorage), else the browser's if it's si or ta, else English.
 * A key missing in Sinhala or Tamil falls back to English; the TypeScript types stop that happening by accident.
 */
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      si: { translation: si },
      ta: { translation: ta },
    },
    fallbackLng: 'en',
    supportedLngs: LANGUAGES.map((language) => language.code),
    // "si-LK" in the browser → "si"
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    // React already escapes what it renders
    interpolation: { escapeValue: false },
  });

// <html lang> follows the language, so screen readers pronounce it right and the browser picks the right font
function setDocumentLanguage(language: string) {
  document.documentElement.lang = language;
}
setDocumentLanguage(currentLanguage());
i18n.on('languageChanged', () => setDocumentLanguage(currentLanguage()));

// The language in use: always one of en, si, ta
export function currentLanguage(): Language {
  const resolved = i18n.resolvedLanguage;
  return LANGUAGES.some((language) => language.code === resolved) ? (resolved as Language) : 'en';
}

// For Intl date formatting, e.g. "si-LK"
export function currentLocale(): string {
  return LANGUAGES.find((language) => language.code === currentLanguage())!.locale;
}

export default i18n;
