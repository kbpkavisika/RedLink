package com.redlink.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Settings under "redlink.seed" for the development sample data (DevDataSeeder).
 * Only for your own machine: set them in application-local.properties, never when deployed.
 *
 * @param enabled  true to create the sample accounts at startup; off unless set
 * @param password the password every sample account signs in with
 */
@ConfigurationProperties(prefix = "redlink.seed")
public record SeedProperties(boolean enabled, String password) {
}
