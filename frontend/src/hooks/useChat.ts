import { useMutation } from '@tanstack/react-query';
import { sendChat } from '../api/chat';
import type { ApiError, ChatMessage, ChatReply } from '../types';

// Asks the AI assistant. Not retried automatically: each try uses the user's limit and the shared Groq quota.
export function useChat() {
  return useMutation<ChatReply, ApiError, ChatMessage[]>({
    mutationFn: sendChat,
    retry: false,
  });
}
