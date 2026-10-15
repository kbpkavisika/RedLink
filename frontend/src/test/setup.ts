// Runs before every test file: adds matchers such as toBeInTheDocument() and cleans up after each test.
// Tests run in English, so they can look for the same words a user sees.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import i18n from '../i18n';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => cleanup());
