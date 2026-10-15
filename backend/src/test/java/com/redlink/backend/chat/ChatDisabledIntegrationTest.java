package com.redlink.backend.chat;

import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.service.GroqClient;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// No Groq key (the test default): the app runs, and the assistant says it isn't available
@IntegrationTest
class ChatDisabledIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;
    @MockitoBean private GroqClient groqClient;

    @Test
    void withoutAKeyTheAssistantIs503() throws Exception {
        User donor = testData.user(testData.unique("kamal"), Role.DONOR);

        mvc.perform(post("/api/chat").header("Authorization", testData.bearer(donor))
                        .contentType("application/json")
                        .content("""
                                {"messages":[{"role":"user","content":"Hello"}]}"""))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("The assistant isn't available right now. Please try again later."));
        verify(groqClient, never()).complete(any());
    }
}
