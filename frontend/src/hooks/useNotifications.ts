import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationKeys,
} from '../api/notifications';
import type { ApiError, NotificationFeed, NotificationItem } from '../types';

// Checks for new notifications every 30 seconds while the app is open (in-app only, no push).
// Paused until a temporary password is changed: the API refuses everything else until then.
export function useNotifications(enabled = true) {
  return useQuery<NotificationFeed, ApiError>({
    queryKey: notificationKeys.all,
    queryFn: getNotifications,
    refetchInterval: 30_000,
    enabled,
  });
}

// Marks one read at once on screen, and puts it back if the server refuses
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation<NotificationItem, ApiError, number, { previous?: NotificationFeed }>({
    mutationFn: markNotificationRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previous = queryClient.getQueryData<NotificationFeed>(notificationKeys.all);
      if (previous) {
        const wasUnread = previous.items.some((item) => item.id === id && !item.read);
        queryClient.setQueryData<NotificationFeed>(notificationKeys.all, {
          unreadCount: Math.max(0, previous.unreadCount - (wasUnread ? 1 : 0)),
          items: previous.items.map((item) => (item.id === id ? { ...item, read: true } : item)),
        });
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(notificationKeys.all, context.previous);
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation<{ updated: number }, ApiError, void, { previous?: NotificationFeed }>({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previous = queryClient.getQueryData<NotificationFeed>(notificationKeys.all);
      if (previous) {
        queryClient.setQueryData<NotificationFeed>(notificationKeys.all, {
          unreadCount: 0,
          items: previous.items.map((item) => ({ ...item, read: true })),
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(notificationKeys.all, context.previous);
    },
  });
}
