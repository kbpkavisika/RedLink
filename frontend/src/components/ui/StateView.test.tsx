import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ApiError } from '../../types';
import { StateView } from './StateView';

const error: ApiError = {
  status: 504,
  error: 'Gateway Timeout',
  message: 'The server took too long to answer.',
  fieldErrors: [],
  ref: '7f3a-19c2',
  timestamp: '',
  path: '/api/donors',
};

describe('StateView (the six screen states)', () => {
  it('loading is announced as busy', () => {
    render(<StateView state="loading" />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.getByText('Loading…').parentElement).toHaveAttribute('aria-busy', 'true');
  });

  it('an error is an alert with the server’s message, the reference, and Try again', async () => {
    const onRetry = vi.fn();
    render(<StateView state="error" error={error} onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('The server took too long to answer.');
    expect(screen.getByText('Error 504 · ref 7f3a-19c2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('success is announced as a status', () => {
    render(<StateView state="success" title="Request #RQ-12 is live" />);

    expect(screen.getByRole('status')).toHaveTextContent('Request #RQ-12 is live');
  });

  it('uses a sensible default title', () => {
    render(<StateView state="no-results" />);

    expect(screen.getByRole('heading', { name: 'No results match these filters' })).toBeInTheDocument();
  });
});
