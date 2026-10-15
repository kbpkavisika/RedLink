import clsx from 'clsx';
import { MessageCircle, RotateCcw, Send, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/useAuth';
import { useChat } from '../../hooks/useChat';
import type { ChatMessage, Role } from '../../types';
import { Button } from '../ui';

// Match the backend: redlink.ai.groq.max-history and max-message-length
const MAX_HISTORY = 12;
const MAX_LENGTH = 1000;
// Show the character count once a message gets this close to the limit
const COUNT_FROM = 800;

// Three starter questions per role, in the chosen language (chat.suggestions.<role>.s1…s3)
const SUGGESTIONS = ['s1', 's2', 's3'] as const;
function suggestionKey(role: Role, suggestion: (typeof SUGGESTIONS)[number]) {
  return `chat.suggestions.${role}.${suggestion}` as const;
}

// The conversation survives moving between pages, and is gone when the tab closes
function storageKey(userId: number) {
  return `redlink.chat.${userId}`;
}

function loadConversation(userId: number): ChatMessage[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(userId)) ?? '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveConversation(userId: number, messages: ChatMessage[]) {
  try {
    if (messages.length) sessionStorage.setItem(storageKey(userId), JSON.stringify(messages));
    else sessionStorage.removeItem(storageKey(userId));
  } catch {
    // Storage blocked or full: the chat still works, it just isn't kept between pages
  }
}

/**
 * The AI assistant (README "AI assistant"): a round button bottom-right that opens a chat panel.
 * On every page in the app shell, and on the home page for signed-in users.
 * Answers come from POST /api/chat; the server keeps nothing, so the history lives here.
 * Hidden when signed out, and until a temporary password is changed, as the API refuses everything else until then.
 */
export function ChatWidget() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const chat = useChat();
  const [open, setOpen] = useState(false);
  const userId = user?.id;
  const [messages, setMessages] = useState<ChatMessage[]>(() => (userId ? loadConversation(userId) : []));
  // On the home page the user can arrive after the first render (sign-in still loading), or change:
  // load that user's conversation then, rather than overwriting it with an empty one
  const [loadedFor, setLoadedFor] = useState(userId);
  if (userId !== loadedFor) {
    setLoadedFor(userId);
    setMessages(userId ? loadConversation(userId) : []);
  }
  const [draft, setDraft] = useState('');
  const panelId = useId();
  const inputId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userId) saveConversation(userId, messages);
  }, [userId, messages]);

  // Newest message in view
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, chat.isPending, chat.isError, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!user || user.mustChangePassword) return null;

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const ask = (conversation: ChatMessage[]) => {
    chat.mutate(conversation.slice(-MAX_HISTORY), {
      onSuccess: ({ reply }) => setMessages((current) => [...current, { role: 'assistant', content: reply }]),
    });
  };

  const send = (text: string) => {
    const question = text.trim();
    if (!question || question.length > MAX_LENGTH || chat.isPending) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setDraft('');
    ask(next);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    send(draft);
  };

  // Enter sends, Shift+Enter is a new line. Not while an input method is still composing (e.g. Sinhala, Tamil).
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(draft);
    }
  };

  const clear = () => {
    setMessages([]);
    chat.reset();
    inputRef.current?.focus();
  };

  const tooLong = draft.trim().length > MAX_LENGTH;

  return (
    <>
      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-label={t('chat.title')}
          onKeyDown={(event) => {
            if (event.key === 'Escape') close();
          }}
          className={clsx(
            'fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-border bg-surface',
            'inset-x-3 top-20 bottom-3',
            'sm:inset-x-auto sm:top-auto sm:right-6 sm:bottom-24 sm:h-[min(560px,calc(100vh-8rem))] sm:w-[380px]',
          )}
        >
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Sparkles size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-body-lg font-semibold text-ink">{t('chat.title')}</h2>
              <p className="text-caption text-text-subtle">{t('chat.subtitle')}</p>
            </div>
            {messages.length > 0 && (
              <Button variant="icon" aria-label={t('chat.clear')} onClick={clear}>
                <Trash2 size={16} aria-hidden="true" />
              </Button>
            )}
            <Button variant="icon" aria-label={t('chat.close')} onClick={close}>
              <X size={18} aria-hidden="true" />
            </Button>
          </header>

          <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-surface-sunken px-4 py-4">
            {messages.length === 0 && (
              <div className="flex flex-col gap-3">
                <p className="rounded-xl bg-surface px-3.5 py-2.5 text-body text-ink-2 ring-1 ring-border">
                  {t('chat.greeting', { name: user.fullName.split(' ')[0] })}
                </p>
                <ul aria-label={t('chat.suggested')} className="flex flex-col items-start gap-2">
                  {SUGGESTIONS.map((key) => t(suggestionKey(user.role, key))).map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        onClick={() => send(suggestion)}
                        className="rounded-full border border-border-strong bg-surface px-3 py-1.5 text-left text-label text-ink-2 hover:border-primary hover:text-primary focus-visible:shadow-focus focus-visible:outline-none"
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* New replies are read out by screen readers */}
            <ol aria-live="polite" aria-label={t('chat.conversation')} className="flex flex-col gap-3">
              {messages.map((message, index) => (
                <li
                  key={index}
                  className={clsx(
                    'max-w-[85%] rounded-xl px-3.5 py-2.5 text-body break-words whitespace-pre-wrap',
                    message.role === 'user'
                      ? 'self-end bg-primary text-white'
                      : 'self-start bg-surface text-ink ring-1 ring-border',
                  )}
                >
                  <span className="sr-only">{message.role === 'user' ? t('chat.you') : t('chat.assistant')}</span>
                  {message.content}
                </li>
              ))}
            </ol>

            {chat.isPending && (
              <p role="status" className="flex items-center gap-1.5 self-start text-label text-text-subtle">
                <span className="flex gap-1" aria-hidden="true">
                  <span className="size-1.5 animate-pulse rounded-full bg-text-subtle" />
                  <span className="size-1.5 animate-pulse rounded-full bg-text-subtle [animation-delay:150ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-text-subtle [animation-delay:300ms]" />
                </span>
                {t('chat.typing')}
              </p>
            )}

            {chat.isError && (
              <div role="alert" className="flex flex-col items-start gap-2 rounded-xl bg-primary-subtle px-3.5 py-2.5">
                <p className="text-body text-primary-hover">{chat.error.message}</p>
                {chat.error.status !== 400 && chat.error.status !== 429 && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<RotateCcw size={14} aria-hidden="true" />}
                    onClick={() => ask(messages)}
                  >
                    {t('common.tryAgain')}
                  </Button>
                )}
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-1.5 border-t border-border px-3 py-3">
            <div className="flex items-end gap-2">
              <label htmlFor={inputId} className="sr-only">
                {t('chat.yourQuestion')}
              </label>
              <textarea
                id={inputId}
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('chat.placeholder')}
                aria-invalid={tooLong || undefined}
                className={clsx(
                  'max-h-32 min-h-10 flex-1 resize-none rounded-lg border bg-surface px-3 py-2 text-body-input text-ink',
                  'field-sizing-content placeholder:text-placeholder focus:border-primary focus:shadow-focus focus:outline-none',
                  tooLong ? 'border-primary' : 'border-border-strong',
                )}
              />
              <button
                type="submit"
                aria-label={t('chat.send')}
                disabled={!draft.trim() || tooLong || chat.isPending}
                className={clsx(
                  'flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white',
                  'transition-colors duration-150 hover:bg-primary-hover focus-visible:shadow-focus focus-visible:outline-none',
                  'disabled:cursor-not-allowed disabled:bg-neutral-soft disabled:text-text-subtle',
                )}
              >
                <Send size={16} aria-hidden="true" />
              </button>
            </div>
            <p className="flex justify-between gap-2 px-1 text-caption text-text-subtle">
              <span>{t('chat.disclaimer')}</span>
              {draft.length >= COUNT_FROM && (
                <span className={clsx(tooLong && 'text-primary-hover')}>
                  {draft.trim().length}/{MAX_LENGTH}
                </span>
              )}
            </p>
          </form>
        </section>
      )}

      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? t('chat.close') : t('chat.open')}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        className={clsx(
          'fixed right-4 bottom-4 z-40 size-14 items-center justify-center rounded-full bg-primary text-white sm:right-6 sm:bottom-6',
          'transition-colors duration-150 hover:bg-primary-hover focus-visible:shadow-focus focus-visible:outline-none',
          // On a phone the open panel fills the screen and has its own close button
          open ? 'hidden sm:flex' : 'flex',
        )}
      >
        {open ? <X size={22} aria-hidden="true" /> : <MessageCircle size={22} aria-hidden="true" />}
      </button>
    </>
  );
}
