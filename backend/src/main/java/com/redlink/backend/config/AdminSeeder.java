package com.redlink.backend.config;

import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.repository.UserRepository;
import com.redlink.backend.util.Emails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the first admin at startup (decision 4). Nobody can register as an admin, so this is the only
 * way the first one exists; further admins are added by an admin.
 *
 *   an admin already exists       → do nothing
 *   redlink.admin.* not set       → log a warning and carry on
 *   settings present but invalid  → refuse to start, saying what's wrong
 *   otherwise                     → create the admin (must change the password at first sign-in)
 */
@Component
public class AdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminProperties properties;

    public AdminSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder, AdminProperties properties) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByRole(Role.ADMIN)) {
            log.debug("An admin account exists; admin seeder has nothing to do");
            return;
        }
        if (!properties.isConfigured()) {
            log.warn("No admin account exists yet. Set redlink.admin.email and redlink.admin.password "
                    + "(or REDLINK_ADMIN_EMAIL / REDLINK_ADMIN_PASSWORD) and restart to create one.");
            return;
        }

        String email = Emails.normalize(properties.email());
        if (!email.contains("@")) {
            throw new IllegalStateException("redlink.admin.email is not an email address: " + email);
        }
        int length = properties.password().length();
        if (length < 8 || length > 72) {
            throw new IllegalStateException("redlink.admin.password must be 8 to 72 characters (it is " + length + ")");
        }
        if (userRepository.existsByEmail(email)) {
            throw new IllegalStateException("Can't create the admin: " + email
                    + " already belongs to a non-admin account. Use another redlink.admin.email.");
        }

        User admin = new User();
        admin.setEmail(email);
        admin.setFullName(properties.fullName());
        admin.setRole(Role.ADMIN);
        admin.setPasswordHash(passwordEncoder.encode(properties.password()));
        // The configured password lives in a settings file or environment variable, so replace it at first sign-in
        admin.setMustChangePassword(true);
        userRepository.save(admin);

        log.info("Created the first admin account: {} (must change the password at first sign-in)", email);
    }
}
