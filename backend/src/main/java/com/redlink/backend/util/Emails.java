package com.redlink.backend.util;

import java.util.Locale;

public final class Emails {

    private Emails() {
    }

    /**
     * " Kamal@Mail.LK " → "kamal@mail.lk". Every email is normalized before it is saved or looked up,
     * so the database's case-sensitive UNIQUE(email) treats different spellings as the same account.
     */
    public static String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
