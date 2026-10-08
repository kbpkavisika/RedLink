package com.redlink.backend.auth;

import com.jayway.jsonpath.JsonPath;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.repository.UserRepository;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * AccountStatusInterceptor: a user with a temporary or seeded password can only read /me and change the
 * password until they do; everything else is 403, whatever their role.
 */
@IntegrationTest
class MustChangePasswordIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;
    @Autowired private UserRepository userRepository;

    private User mustChange(Role role) {
        User user = testData.user(testData.unique("temp"), role);
        user.setMustChangePassword(true);
        return userRepository.saveAndFlush(user);
    }

    private String changePasswordJson() {
        return """
                {"currentPassword":"%s","newPassword":"N3w-Passw0rd!"}""".formatted(TestData.PASSWORD);
    }

    @Test
    void everythingElseIs403UntilThePasswordChanges() throws Exception {
        User admin = mustChange(Role.ADMIN);

        mvc.perform(get("/api/admin/users").header("Authorization", testData.bearer(admin)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Change your password before you continue."));
        mvc.perform(get("/api/notifications").header("Authorization", testData.bearer(admin)))
                .andExpect(status().isForbidden());
    }

    @Test
    void appliesToEveryRole() throws Exception {
        User donor = mustChange(Role.DONOR);

        mvc.perform(get("/api/donor/me").header("Authorization", testData.bearer(donor)))
                .andExpect(status().isForbidden());
    }

    @Test
    void canStillReadMe() throws Exception {
        User admin = mustChange(Role.ADMIN);

        mvc.perform(get("/api/auth/me").header("Authorization", testData.bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(true));
    }

    @Test
    void changingThePasswordUnlocksTheApi() throws Exception {
        User admin = mustChange(Role.ADMIN);

        String body = mvc.perform(patch("/api/auth/me/password").header("Authorization", testData.bearer(admin))
                        .contentType("application/json").content(changePasswordJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.mustChangePassword").value(false))
                .andReturn().getResponse().getContentAsString();

        // The token the change returned, since older ones stop working
        mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + JsonPath.read(body, "$.token")))
                .andExpect(status().isOk());
    }

    @Test
    void disabledAccountIs403EvenOnEndpointsThatDontLoadTheUser() throws Exception {
        User admin = testData.admin();
        admin.setEnabled(false);
        userRepository.saveAndFlush(admin);

        mvc.perform(get("/api/admin/users").header("Authorization", testData.bearer(admin)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(containsString("disabled")));
    }
}
