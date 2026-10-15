import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendChat } from '../../api/chat';
import { AuthContext } from '../../auth/authContext';
import { donor, renderWithAuth } from '../../test/renderWithAuth';
import type { ApiError } from '../../types';
import { ChatWidget } from './ChatWidget';

vi.mock('../../api/chat', () => ({ sendChat: vi.fn() }));
const mockedSendChat = vi.mocked(sendChat);

function apiError(status: number, message: string): ApiError {
  return { status, error: '', message, fieldErrors: [], ref: 'ab12-cd34', timestamp: '', path: '/api/chat' };
}

function renderAsDonor() {
  return renderWithAuth(<ChatWidget />, { user: donor, status: 'authenticated' });
}

describe('ChatWidget (AI assistant)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => mockedSendChat.mockReset());

  it('opens with a greeting and suggestions for the role', async () => {
    renderAsDonor();

    await userEvent.click(screen.getByRole('button', { name: 'Open assistant' }));

    const dialog = screen.getByRole('dialog', { name: 'RedLink assistant' });
    expect(dialog).toHaveTextContent('Hi Kamal!');
    expect(within(dialog).getByRole('button', { name: 'Who can donate blood?' })).toBeInTheDocument();
    expect(screen.getByLabelText('Your question')).toHaveFocus();
  });

  it('sends the question with Enter and shows the reply', async () => {
    mockedSendChat.mockResolvedValue({ reply: 'Most healthy adults aged 18 to 60.' });
    renderAsDonor();
    await userEvent.click(screen.getByRole('button', { name: 'Open assistant' }));

    await userEvent.type(screen.getByLabelText('Your question'), '  Can I donate?  {Enter}');

    expect(await screen.findByText('Most healthy adults aged 18 to 60.')).toBeInTheDocument();
    expect(mockedSendChat.mock.lastCall?.[0]).toEqual([{ role: 'user', content: 'Can I donate?' }]);
    expect(screen.getByLabelText('Your question')).toHaveValue('');
  });

  it('sends the earlier messages with a follow-up question', async () => {
    mockedSendChat.mockResolvedValueOnce({ reply: 'First answer.' }).mockResolvedValueOnce({ reply: 'Second answer.' });
    renderAsDonor();
    await userEvent.click(screen.getByRole('button', { name: 'Open assistant' }));

    await userEvent.click(screen.getByRole('button', { name: 'Who can donate blood?' }));
    await screen.findByText('First answer.');
    await userEvent.type(screen.getByLabelText('Your question'), 'And how often?{Enter}');
    await screen.findByText('Second answer.');

    expect(mockedSendChat.mock.lastCall?.[0]).toEqual([
      { role: 'user', content: 'Who can donate blood?' },
      { role: 'assistant', content: 'First answer.' },
      { role: 'user', content: 'And how often?' },
    ]);
  });

  it('shows the server’s message and can try again', async () => {
    mockedSendChat
      .mockRejectedValueOnce(apiError(503, 'The assistant is busy right now. Please try again in a minute.'))
      .mockResolvedValueOnce({ reply: 'Here you go.' });
    renderAsDonor();
    await userEvent.click(screen.getByRole('button', { name: 'Open assistant' }));

    await userEvent.type(screen.getByLabelText('Your question'), 'Hello{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('The assistant is busy right now.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Here you go.')).toBeInTheDocument();
    expect(mockedSendChat.mock.lastCall?.[0]).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('offers no retry when over the limit', async () => {
    mockedSendChat.mockRejectedValue(apiError(429, 'Too many messages to the assistant. Please try again in 5 minutes.'));
    renderAsDonor();
    await userEvent.click(screen.getByRole('button', { name: 'Open assistant' }));

    await userEvent.type(screen.getByLabelText('Your question'), 'Hello{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many messages');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('clears the conversation', async () => {
    mockedSendChat.mockResolvedValue({ reply: 'An answer.' });
    renderAsDonor();
    await userEvent.click(screen.getByRole('button', { name: 'Open assistant' }));
    await userEvent.type(screen.getByLabelText('Your question'), 'Hello{Enter}');
    await screen.findByText('An answer.');

    await userEvent.click(screen.getByRole('button', { name: 'Clear chat' }));

    expect(screen.queryByText('An answer.')).not.toBeInTheDocument();
    expect(screen.getByText(/Hi Kamal!/)).toBeInTheDocument();
    expect(sessionStorage.getItem('redlink.chat.1')).toBeNull();
  });

  it('Escape closes the panel and returns focus to the button', async () => {
    renderAsDonor();
    await userEvent.click(screen.getByRole('button', { name: 'Open assistant' }));

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open assistant' })).toHaveFocus();
  });

  it('is hidden when signed out (e.g. on the home page)', () => {
    renderWithAuth(<ChatWidget />);

    expect(screen.queryByRole('button', { name: 'Open assistant' })).not.toBeInTheDocument();
  });

  it('keeps the saved conversation when sign-in finishes after the first render', async () => {
    const saved = [
      { role: 'user', content: 'Who can donate blood?' },
      { role: 'assistant', content: 'Most healthy adults.' },
    ];
    sessionStorage.setItem('redlink.chat.1', JSON.stringify(saved));
    const { rerender, auth } = renderWithAuth(<ChatWidget />, { status: 'loading' });

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <AuthContext.Provider value={{ ...auth, user: donor, status: 'authenticated' }}>
          <ChatWidget />
        </AuthContext.Provider>
      </QueryClientProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open assistant' }));

    expect(screen.getByText('Most healthy adults.')).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem('redlink.chat.1') ?? '[]')).toEqual(saved);
  });

  it('is hidden until a temporary password is changed', () => {
    renderWithAuth(<ChatWidget />, { user: { ...donor, mustChangePassword: true }, status: 'authenticated' });

    expect(screen.queryByRole('button', { name: 'Open assistant' })).not.toBeInTheDocument();
  });
});
