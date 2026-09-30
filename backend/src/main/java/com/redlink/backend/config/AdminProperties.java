package com.redlink.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Settings under "redlink.admin" for the first admin account (created once by AdminSeeder).
 * Never committed: application-local.properties locally, REDLINK_ADMIN_EMAIL / REDLINK_ADMIN_PASSWORD when deployed.
 *
 * @param email    the admin's sign-in email
 * @param password the first password; the admin must change it at first sign-in
 * @param fullName shown in the app, default "RedLink Admin"
 */
@ConfigurationProperties(prefix = "redlink.admin")
public record AdminProperties(String email, String password, String fullName) {

    public AdminProperties {
        fullName = (fullName == null || fullName.isBlank()) ? "RedLink Admin" : fullName.trim();
    }

    public boolean isConfigured() {
        return email != null && !email.isBlank() && password != null && !password.isBlank();
    }
}
