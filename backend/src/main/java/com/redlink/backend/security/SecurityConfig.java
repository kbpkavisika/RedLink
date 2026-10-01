package com.redlink.backend.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.redlink.backend.config.CorsProperties;
import com.redlink.backend.config.JwtProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import tools.jackson.databind.json.JsonMapper;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

/**
 * Who may call what. Every request passes through here before reaching a controller:
 *   read "Authorization: Bearer <token>" → verify signature, expiry and issuer (bad → 401)
 *   → read the role from the token → check the URL rules below (not allowed → 403)
 *
 * Rules are checked top to bottom; the first match wins. /api/requests is shared: staff create and
 * manage requests, donors respond, so the donor endpoints are listed before the staff catch-all.
 * Hospital approval is not a role: services check it and throw ForbiddenException.
 */
@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties({JwtProperties.class, CorsProperties.class})
public class SecurityConfig {

    // The claim in our tokens that holds the user's role, e.g. "DONOR"
    public static final String ROLE_CLAIM = "role";

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JsonAuthErrorHandler authErrors,
                                            JwtAuthenticationConverter jwtAuthenticationConverter) throws Exception {
        http
                // The token travels in a header, never a cookie, so cross-site request forgery can't use it
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                // No server-side sessions: each request proves who it is with its token
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/donor/**").hasRole("DONOR")
                        .requestMatchers("/api/donors/**").hasRole("ADMIN")
                        // Donors answer a request under /api/requests/{id}/responses; checked before the
                        // hospital rule below because the first matching rule wins
                        .requestMatchers(HttpMethod.POST, "/api/requests/*/responses").hasRole("DONOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/requests/*/responses/me").hasRole("DONOR")
                        .requestMatchers("/api/requests/**").hasRole("HOSPITAL_STAFF")
                        // Everything else needs a signed-in user of any role
                        .anyRequest().authenticated())
                .oauth2ResourceServer(resourceServer -> resourceServer
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter))
                        .authenticationEntryPoint(authErrors)
                        .accessDeniedHandler(authErrors))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(authErrors)
                        .accessDeniedHandler(authErrors));
        return http.build();
    }

    @Bean
    JsonAuthErrorHandler jsonAuthErrorHandler(JsonMapper jsonMapper) {
        return new JsonAuthErrorHandler(jsonMapper);
    }

    // The same secret signs tokens (at login) and verifies them (on every request)
    @Bean
    SecretKey jwtSigningKey(JwtProperties properties) {
        return new SecretKeySpec(properties.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    // Signs new tokens at sign-in (used by JwtService)
    @Bean
    JwtEncoder jwtEncoder(SecretKey jwtSigningKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSigningKey));
    }

    // Rejects tokens with a bad signature, an unexpected algorithm, a wrong issuer, or past their expiry
    @Bean
    JwtDecoder jwtDecoder(SecretKey jwtSigningKey, JwtProperties properties) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtSigningKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(properties.issuer()));
        return decoder;
    }

    // "role": "DONOR" in the token → authority ROLE_DONOR, which is what hasRole("DONOR") checks
    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName(ROLE_CLAIM);
        authorities.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }

    // BCrypt (stored as "{bcrypt}$2a$10$…"). The prefix lets a stronger algorithm be adopted later
    // without breaking existing hashes.
    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    // Only the configured frontend origins may call the API from a browser (none in development)
    @Bean
    CorsConfigurationSource corsConfigurationSource(CorsProperties properties) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(properties.allowedOrigins());
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        cors.setMaxAge(Duration.ofHours(1));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cors);
        return source;
    }
}
