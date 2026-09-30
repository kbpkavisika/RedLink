package com.redlink.backend.security;

import com.redlink.backend.exception.ForbiddenException;
import com.redlink.backend.exception.UnauthorizedException;
import com.redlink.backend.model.User;
import com.redlink.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * "Who is making this request?" for services.
 *
 * require() loads the user from the database on every call instead of trusting the token alone,
 * so an account an admin disables stops working on its next request, not when the token expires.
 */
@Component
public class CurrentUser {

    private static final String SIGN_IN_AGAIN = "You're not signed in, or your session has expired. Please sign in again.";

    private final UserRepository userRepository;

    public CurrentUser(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // The user id from the verified token ("sub" claim)
    public Long id() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthentication)) {
            throw new UnauthorizedException(SIGN_IN_AGAIN);
        }
        try {
            return Long.valueOf(jwtAuthentication.getToken().getSubject());
        } catch (NumberFormatException e) {
            throw new UnauthorizedException(SIGN_IN_AGAIN);
        }
    }

    // The signed-in user, still existing and enabled
    public User require() {
        User user = userRepository.findById(id())
                .orElseThrow(() -> new UnauthorizedException(SIGN_IN_AGAIN));
        if (!user.isEnabled()) {
            throw new ForbiddenException("This account is disabled. Contact admin@redlink.lk for help.");
        }
        return user;
    }
}
