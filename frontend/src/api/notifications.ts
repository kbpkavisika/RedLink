import type { NotificationFeed, NotificationItem } from '../types';
import api from './client';

export const notificationKeys = {
  all: ['notifications'] as const,
};

export async function getNotifications(): Promise<NotificationFeed> {
  const { data } = await api.get<NotificationFeed>('/notifications');
  return data;
}

export async function markNotificationRead(id: number): Promise<NotificationItem> {
  const { data } = await api.patch<NotificationItem>(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const { data } = await api.patch<{ updated: number }>('/notifications/read-all');
  return data;
}
