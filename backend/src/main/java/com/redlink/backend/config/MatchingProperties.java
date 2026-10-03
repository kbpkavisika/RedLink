package com.redlink.backend.config;

import com.redlink.backend.model.enums.Urgency;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Settings under "redlink.matching": how many of a request's matches are notified (H6).
 *
 *   notified = min(units needed × urgency multiplier, maxNotified, number of matches)
 *
 * Defaults are in application.properties, so they can be tuned without code changes.
 * A missing or non-positive value stops the app at startup, saying which one.
 *
 * @param multiplier  donors to notify per unit needed, by urgency
 * @param maxNotified never notify more donors than this for one request
 */
@ConfigurationProperties(prefix = "redlink.matching")
public record MatchingProperties(Multiplier multiplier, int maxNotified) {

    public record Multiplier(int low, int medium, int high, int critical) {
        public Multiplier {
            requirePositive(low, "multiplier.low");
            requirePositive(medium, "multiplier.medium");
            requirePositive(high, "multiplier.high");
            requirePositive(critical, "multiplier.critical");
        }

        public int of(Urgency urgency) {
            return switch (urgency) {
                case LOW -> low;
                case MEDIUM -> medium;
                case HIGH -> high;
                case CRITICAL -> critical;
            };
        }
    }

    public MatchingProperties {
        if (multiplier == null) {
            throw new IllegalStateException("redlink.matching.multiplier.* must be set (see application.properties)");
        }
        requirePositive(maxNotified, "max-notified");
    }

    public int notifiedCount(int unitsNeeded, Urgency urgency, int matches) {
        int wanted = unitsNeeded * multiplier.of(urgency);
        return Math.max(0, Math.min(Math.min(wanted, maxNotified), matches));
    }

    private static void requirePositive(int value, String name) {
        if (value <= 0) {
            throw new IllegalStateException("redlink.matching." + name + " must be a positive number (it is " + value + ")");
        }
    }
}
