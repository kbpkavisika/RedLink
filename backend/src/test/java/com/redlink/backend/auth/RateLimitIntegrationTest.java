package com.redlink.backend.auth;

import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Limits switched on, over real HTTP: the 429 uses the usual error body plus Retry-After, and is answered
 * before the password is checked. Each test uses its own address (X-Real-IP), as the limiter is shared.
 */
@IntegrationTest
@TestPropertySource(properties = {
        "redlink.rate-limit.enabled=true",
        "redlink.rate-limit.login-per-ip.requests=2",
        "redlink.rate-limit.register-per-ip.requests=1",
        "redlink.rate-limit.client-ip-header=X-Real-IP"
})
class RateLimitIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;

    private ResultActions login(String address, String email) throws Exception {
        return mvc.perform(post("/api/auth/login").header("X-Real-IP", address)
                .contentType("application/json")
                .content("""
                        {"email":"%s","password":"wrong-password"}""".formatted(email)));
    }

    @Test
    void signInOverTheLimitIs429WithRetryAfter() throws Exception {
        String address = testData.unique("198.51.100");
        login(address, "nobody@test.redlink.lk").andExpect(status().isUnauthorized());
        login(address, "nobody@test.redlink.lk").andExpect(status().isUnauthorized());

        login(address, "nobody@test.redlink.lk")
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", matchesPattern("\\d+")))
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.message").value(matchesPattern(
                        "Too many sign-in attempts from your network\\. Please try again in \\d+ (seconds?|minutes?)\\.")))
                .andExpect(jsonPath("$.ref").isNotEmpty());
    }

    @Test
    void registrationOverTheLimitIs429() throws Exception {
        String address = testData.unique("203.0.113");
        String donor = """
                {"fullName":"Kamal Perera","email":"%s","phone":"0771234567","password":"%s",
                 "bloodGroup":"O+","dateOfBirth":"1995-04-12","city":"Colombo"}""";

        mvc.perform(post("/api/auth/register/donor").header("X-Real-IP", address).contentType("application/json")
                        .content(donor.formatted(testData.email(testData.unique("kamal")), TestData.PASSWORD)))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/auth/register/donor").header("X-Real-IP", address).contentType("application/json")
                        .content(donor.formatted(testData.email(testData.unique("kamal")), TestData.PASSWORD)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
    }
}
