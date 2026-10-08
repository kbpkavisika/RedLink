package com.redlink.backend.security;

import com.redlink.backend.exception.ForbiddenException;
import com.redlink.backend.exception.UnauthorizedException;
import com.redlink.backend.model.User;
import com.redlink.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * "Who is making this request?" for services.
 *
 * require() loads the user from the database on every call instead of trusting the token alone,
 * so an account an admin disables stops working on its next request, not when the token expires,
 * and a password change signs out every token issued before it.
 */
@Component
public class CurrentUser {

    private static final String SIGN_IN_AGAIN = "You're not signed in, or your session has expired. Please sign in again.";
    static final String PASSWORD_CHANGED = "Your password was changed. Please sign in again.";

    private final UserRepository userRepository;

    public CurrentUser(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // The verified token of this request
    public Jwt token() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthentication)) {
            throw new UnauthorizedException(SIGN_IN_AGAIN);
        }
        return jwtAuthentication.getToken();
    }

    // The user id from the verified token ("sub" claim)
    public Long id() {
        try {
            return Long.valueOf(token().getSubject());
        } catch (NumberFormatException e) {
            throw new UnauthorizedException(SIGN_IN_AGAIN);
        }
    }

    // The signed-in user, still existing and enabled, with a token newer than their last password change
    public User require() {
        User user = userRepository.findById(id())
                .orElseThrow(() -> new UnauthorizedException(SIGN_IN_AGAIN));
        if (issuedBeforePasswordChange(token(), user)) {
            throw new UnauthorizedException(PASSWORD_CHANGED);
        }
        if (!user.isEnabled()) {
            throw new ForbiddenException("This account is disabled. Contact admin@redlink.lk for help.");
        }
        return user;
    }

    // A token's "iat" is in whole seconds, so the change time is compared at the same precision:
    // the new token issued by the change itself (same second) stays valid
    private static boolean issuedBeforePasswordChange(Jwt token, User user) {
        Instant changedAt = user.getPasswordChangedAt();
        if (changedAt == null) {
            return false;
        }
        Instant issuedAt = token.getIssuedAt();
        return issuedAt == null || issuedAt.isBefore(changedAt.truncatedTo(ChronoUnit.SECONDS));
    }
}
