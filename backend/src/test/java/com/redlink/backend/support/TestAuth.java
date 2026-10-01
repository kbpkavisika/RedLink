package com.redlink.backend.support;

import com.redlink.backend.model.enums.Role;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

/**
 * Fake signed-in users for @WebMvcTest controller tests, where no real token or database exists:
 * mvc.perform(get("/api/donors").with(TestAuth.ADMIN))
 */
public final class TestAuth {

    public static final RequestPostProcessor ADMIN = as(Role.ADMIN);
    public static final RequestPostProcessor HOSPITAL_STAFF = as(Role.HOSPITAL_STAFF);
    public static final RequestPostProcessor DONOR = as(Role.DONOR);

    private TestAuth() {
    }

    public static RequestPostProcessor as(Role role) {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
}
