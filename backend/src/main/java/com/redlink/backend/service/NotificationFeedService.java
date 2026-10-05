package com.redlink.backend.service;

import com.redlink.backend.dto.notification.NotificationFeed;
import com.redlink.backend.exception.NotFoundException;
import com.redlink.backend.model.Notification;
import com.redlink.backend.repository.NotificationRepository;
import com.redlink.backend.security.CurrentUser;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reading and marking the signed-in user's own notifications (S4). Works for every role.
 * Writing them is NotificationService's job.
 */
@Service
@Transactional(readOnly = true)
public class NotificationFeedService {

    // The bell and the list show the latest ones; older notifications stay in the database
    static final int MAX_ITEMS = 100;

    private final NotificationRepository notificationRepository;
    private final CurrentUser currentUser;

    public NotificationFeedService(NotificationRepository notificationRepository, CurrentUser currentUser) {
        this.notificationRepository = notificationRepository;
        this.currentUser = currentUser;
    }

    public NotificationFeed feed() {
        Long userId = currentUser.require().getId();
        return new NotificationFeed(
                notificationRepository.countByUserIdAndReadFalse(userId),
                notificationRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId, Limit.of(MAX_ITEMS)).stream()
                        .map(NotificationFeed.Item::from)
                        .toList());
    }

    // Marking one that is already read is fine: it just stays read
    @Transactional
    public NotificationFeed.Item markRead(Long id) {
        Notification notification = notificationRepository.findByIdAndUserId(id, currentUser.require().getId())
                .orElseThrow(() -> new NotFoundException("Notification " + id + " was not found."));
        notification.setRead(true);
        return NotificationFeed.Item.from(notification);
    }

    // Returns how many were marked
    @Transactional
    public int markAllRead() {
        return notificationRepository.markAllRead(currentUser.require().getId());
    }
}
