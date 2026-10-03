package com.redlink.backend.util;

import java.util.Locale;

public final class Cities {

    private Cities() {
    }

    /**
     * "  Nuwara   eliya " → "nuwara eliya". Cities are typed freely, so matching compares this form:
     * "colombo", "Colombo" and "COLOMBO " are the same city.
     */
    public static String normalize(String city) {
        return city == null ? "" : city.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    public static boolean same(String a, String b) {
        return !normalize(a).isEmpty() && normalize(a).equals(normalize(b));
    }
}
