package com.redlink.backend.repository;

import com.redlink.backend.model.Notification;
import com.redlink.backend.model.enums.Role;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Everyone notified about a request, in the order they were notified (best match first)
    List<Notification> findByRequestIdOrderById(Long requestId);

    // A user's notifications, newest first (idx_notifications_user_unread covers user_id + created_at)
    List<Notification> findByUserIdOrderByCreatedAtDescIdDesc(Long userId);

    List<Notification> findByUserIdOrderByCreatedAtDescIdDesc(Long userId, Limit limit);

    long countByUserIdAndReadFalse(Long userId);

    // Only the owner's: someone else's notification is "not found"
    Optional<Notification> findByIdAndUserId(Long id, Long userId);

    // Returns how many were marked. Flushes before and clears after, so loaded notifications aren't stale.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Notification n set n.read = true where n.user.id = :userId and n.read = false")
    int markAllRead(Long userId);

    // Donors notified about a request; staff notifications about the same request don't count
    long countByRequestIdAndUserRole(Long requestId, Role role);
}
