// Runs before every test file: adds matchers such as toBeInTheDocument() and cleans up after each test
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
