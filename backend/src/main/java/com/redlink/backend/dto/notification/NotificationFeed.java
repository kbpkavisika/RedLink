package com.redlink.backend.dto.notification;

import com.redlink.backend.dto.request.BloodRequestDetail;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Notification;

import java.time.Instant;
import java.util.List;

/**
 * GET /api/notifications (S4): the signed-in user's latest notifications, newest first, and how many are unread
 * in total (the bell's badge), which can be more than the items returned.
 */
public record NotificationFeed(long unreadCount, List<Item> items) {

    /**
     * @param requestId / reference the request it's about, so the app can open it; null for e.g. a hospital decision
     */
    public record Item(Long id, String message, boolean read, Instant createdAt, Long requestId, String reference) {

        public static Item from(Notification notification) {
            BloodRequest request = notification.getRequest(); // only its id is read, so the proxy isn't loaded
            return new Item(
                    notification.getId(),
                    notification.getMessage(),
                    notification.isRead(),
                    notification.getCreatedAt(),
                    request == null ? null : request.getId(),
                    request == null ? null : BloodRequestDetail.reference(request.getId())
            );
        }
    }
}
