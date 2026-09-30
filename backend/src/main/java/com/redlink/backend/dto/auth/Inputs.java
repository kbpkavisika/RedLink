package com.redlink.backend.dto.auth;

import java.util.Locale;

// Tidies text as it arrives, before validation, so " 077 123 4567 " is checked as "0771234567"
final class Inputs {

    // Sri Lankan phone: 10 digits starting with 0, e.g. 0771234567 or 0112345678
    static final String PHONE_PATTERN = "0\\d{9}";
    static final String PHONE_MESSAGE = "must be 10 digits starting with 0, e.g. 0771234567";

    private Inputs() {
    }

    static String trim(String value) {
        return value == null ? null : value.trim();
    }

    // Spaces and dashes people type in phone numbers are removed
    static String phone(String value) {
        return value == null ? null : value.replaceAll("[\\s-]", "");
    }

    static String upper(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }
}
