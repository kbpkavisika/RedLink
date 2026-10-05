package com.redlink.backend.controller;

import com.redlink.backend.dto.notification.NotificationFeed;
import com.redlink.backend.service.NotificationFeedService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// The signed-in user's notifications. Any role: SecurityConfig only requires a valid token here.
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationFeedService notificationFeedService;

    public NotificationController(NotificationFeedService notificationFeedService) {
        this.notificationFeedService = notificationFeedService;
    }

    // Latest 100, newest first, plus the total unread count
    @GetMapping
    public NotificationFeed feed() {
        return notificationFeedService.feed();
    }

    @PatchMapping("/{id}/read")
    public NotificationFeed.Item markRead(@PathVariable Long id) {
        return notificationFeedService.markRead(id);
    }

    // {"updated": 3}
    @PatchMapping("/read-all")
    public Map<String, Integer> markAllRead() {
        return Map.of("updated", notificationFeedService.markAllRead());
    }
}
