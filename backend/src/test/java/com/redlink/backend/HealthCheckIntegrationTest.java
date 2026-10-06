package com.redlink.backend;

import com.redlink.backend.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// The host checks /actuator/health without a token; it must say UP and nothing more, and nothing else is exposed
@IntegrationTest
class HealthCheckIntegrationTest {

    @Autowired private MockMvc mvc;

    @Test
    void healthIsPublicAndSaysOnlyUp() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist())
                .andExpect(jsonPath("$.details").doesNotExist());
    }

    @Test
    void otherActuatorEndpointsAreNotExposed() throws Exception {
        // env and beans would leak configuration; without a token they're refused, with one they don't exist
        mvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized());
        mvc.perform(get("/actuator/beans")).andExpect(status().isUnauthorized());
    }
}
