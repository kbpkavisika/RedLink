package com.redlink.backend.repository;

import com.redlink.backend.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Everyone notified about a request, in the order they were notified (best match first)
    List<Notification> findByRequestIdOrderById(Long requestId);
}
