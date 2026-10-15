import type { ChatMessage, ChatReply } from '../types';
import api from './client';

// The conversation so far, ending with the user's question → the assistant's answer
export async function sendChat(messages: ChatMessage[]): Promise<ChatReply> {
  const { data } = await api.post<ChatReply>('/chat', { messages });
  return data;
}
