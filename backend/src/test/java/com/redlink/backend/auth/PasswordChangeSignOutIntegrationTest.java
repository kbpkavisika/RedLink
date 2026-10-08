package com.redlink.backend.auth;

import com.jayway.jsonpath.JsonPath;
import com.redlink.backend.config.JwtProperties;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import com.redlink.backend.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Changing the password signs out every token issued before the change (another browser, a stolen token),
 * and the device that made the change carries on with the new token it gets back.
 */
@IntegrationTest
class PasswordChangeSignOutIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;
    @Autowired private JwtEncoder jwtEncoder;
    @Autowired private JwtProperties jwtProperties;

    // A token signed a minute ago: "iat" is in whole seconds, so a token from this second would still count as new
    private String oldToken(User user, boolean rememberMe) {
        Clock aMinuteAgo = Clock.fixed(Instant.now().minus(Duration.ofMinutes(1)), ZoneOffset.UTC);
        return new JwtService(jwtEncoder, jwtProperties, aMinuteAgo).issue(user, rememberMe).token();
    }

    private String changePassword(String token) throws Exception {
        return mvc.perform(patch("/api/auth/me/password").header("Authorization", "Bearer " + token)
                        .contentType("application/json").content("""
                                {"currentPassword":"%s","newPassword":"N3w-Passw0rd!"}""".formatted(TestData.PASSWORD)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    @Test
    void olderTokensAreSignedOutAndTheNewOneWorks() throws Exception {
        User donor = testData.user(testData.unique("donor"), Role.DONOR);
        String thisDevice = oldToken(donor, false);
        String otherDevice = oldToken(donor, false);

        String newToken = JsonPath.read(changePassword(thisDevice), "$.token");

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + otherDevice))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Your password was changed. Please sign in again."));
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + thisDevice))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + newToken))
                .andExpect(status().isOk());
    }

    @Test
    void newTokenKeepsTheKeepMeSignedInChoice() throws Exception {
        User rememberedDonor = testData.user(testData.unique("donor"), Role.DONOR);
        User normalDonor = testData.user(testData.unique("donor"), Role.DONOR);

        Instant remembered = Instant.parse(JsonPath.read(changePassword(oldToken(rememberedDonor, true)), "$.expiresAt"));
        Instant normal = Instant.parse(JsonPath.read(changePassword(oldToken(normalDonor, false)), "$.expiresAt"));

        assertThat(Duration.between(Instant.now(), remembered)).isGreaterThan(Duration.ofDays(6));
        assertThat(Duration.between(Instant.now(), normal)).isLessThanOrEqualTo(Duration.ofHours(12));
    }
}
