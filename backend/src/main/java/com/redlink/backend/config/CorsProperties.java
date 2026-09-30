package com.redlink.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Settings under "redlink.cors".
 * In development the Vite proxy makes every call same-origin, so this stays empty.
 * When deployed, set it to the frontend's address, e.g. REDLINK_CORS_ALLOWED_ORIGINS=https://redlink.vercel.app
 *
 * @param allowedOrigins browser origins allowed to call the API; empty = none
 */
@ConfigurationProperties(prefix = "redlink.cors")
public record CorsProperties(List<String> allowedOrigins) {

    public CorsProperties {
        allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
    }
}
