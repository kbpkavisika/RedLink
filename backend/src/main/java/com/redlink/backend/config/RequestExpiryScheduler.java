package com.redlink.backend.config;

import com.redlink.backend.service.RequestExpiryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * Runs the expiry job (H10) once at startup, to catch up after downtime, then every
 * redlink.expiry.interval (default 5 minutes) after the previous run finishes.
 * Off when redlink.expiry.enabled=false (the tests run RequestExpiryService themselves).
 */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "redlink.expiry.enabled", havingValue = "true", matchIfMissing = true)
public class RequestExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(RequestExpiryScheduler.class);

    private final RequestExpiryService requestExpiryService;

    public RequestExpiryScheduler(RequestExpiryService requestExpiryService) {
        this.requestExpiryService = requestExpiryService;
    }

    @Scheduled(initialDelay = 0, fixedDelayString = "${redlink.expiry.interval:PT5M}")
    public void expireOverdueRequests() {
        try {
            requestExpiryService.expireOverdue();
        } catch (RuntimeException e) {
            // Logged and tried again next run; an exception here would otherwise only show in the scheduler's log
            log.error("Expiring overdue requests failed; will try again next run", e);
        }
    }
}
