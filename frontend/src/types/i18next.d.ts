import 'i18next';
import type { Translation } from '../locales/en';

// Makes t('…') check its key against the English file: a typo or a removed key fails the build
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: Translation };
  }
}
