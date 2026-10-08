package com.redlink.backend.security;

import com.redlink.backend.exception.ForbiddenException;
import com.redlink.backend.model.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Runs before every signed-in API call, after SecurityConfig has checked the token and the role:
 *   account deleted                → 401
 *   account disabled               → 403
 *   must change password (a temporary or seeded one) → 403, except reading /me and changing the password
 *   otherwise                      → carry on to the controller
 *
 * The frontend already sends such users to /change-password; this stops anyone calling the API directly
 * from carrying on with a password an admin or a settings file chose. Throws, so GlobalExceptionHandler
 * writes the usual error body.
 */
@Component
public class AccountStatusInterceptor implements HandlerInterceptor {

    static final String CHANGE_PASSWORD_FIRST = "Change your password before you continue.";

    private final CurrentUser currentUser;

    public AccountStatusInterceptor(CurrentUser currentUser) {
        this.currentUser = currentUser;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // Public endpoints (sign-in, registration) have no token, so there's no account to check
        if (!(SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken)) {
            return true;
        }
        User user = currentUser.require();
        if (user.isMustChangePassword() && !isAllowedBeforePasswordChange(request)) {
            throw new ForbiddenException(CHANGE_PASSWORD_FIRST);
        }
        return true;
    }

    // What the change-password page needs: who am I, and the change itself
    private static boolean isAllowedBeforePasswordChange(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        return (HttpMethod.GET.matches(method) && path.equals("/api/auth/me"))
                || (HttpMethod.PATCH.matches(method) && path.equals("/api/auth/me/password"));
    }
}
