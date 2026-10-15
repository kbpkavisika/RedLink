package com.redlink.backend.service;

import com.redlink.backend.config.GroqProperties;
import com.redlink.backend.exception.ServiceUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

// The Groq request we send, and how each kind of Groq failure becomes a 503 with a plain message
class GroqClientTest {

    private static final String URL = "https://groq.test/openai/v1/chat/completions";
    private static final List<GroqClient.Message> MESSAGES = List.of(
            new GroqClient.Message("system", "Be helpful."),
            new GroqClient.Message("user", "Who can donate?"));

    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer groq = MockRestServiceServer.bindTo(builder).build();
    private final GroqClient client = new GroqClient(properties("low"), builder);

    private static GroqProperties properties(String reasoningEffort) {
        return new GroqProperties("test-key", "https://groq.test/openai/v1", "test-model", reasoningEffort,
                200, Duration.ofSeconds(5), 12, 1000);
    }

    @Test
    void sendsTheModelKeyAndConversationAndReturnsTheReply() {
        groq.expect(requestTo(URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-key"))
                .andExpect(content().json("""
                        {"model":"test-model","max_tokens":200,"reasoning_effort":"low",
                         "messages":[{"role":"system","content":"Be helpful."},{"role":"user","content":"Who can donate?"}]}"""))
                .andRespond(withSuccess("""
                        {"id":"x","choices":[{"index":0,"message":{"role":"assistant","content":"  Most healthy adults.  "},
                         "finish_reason":"stop"}],"usage":{"total_tokens":42}}""", MediaType.APPLICATION_JSON));

        assertThat(client.complete(MESSAGES)).isEqualTo("Most healthy adults.");
        groq.verify();
    }

    @Test
    void leavesOutReasoningEffortWhenNotSet() {
        RestClient.Builder plainBuilder = RestClient.builder();
        MockRestServiceServer plainGroq = MockRestServiceServer.bindTo(plainBuilder).build();
        GroqClient plainClient = new GroqClient(properties(" "), plainBuilder);
        plainGroq.expect(requestTo(URL))
                .andExpect(jsonPath("$.model").value("test-model"))
                .andExpect(jsonPath("$.reasoning_effort").doesNotExist())
                .andRespond(withSuccess("""
                        {"choices":[{"message":{"role":"assistant","content":"Hi"}}]}""", MediaType.APPLICATION_JSON));

        assertThat(plainClient.complete(MESSAGES)).isEqualTo("Hi");
        plainGroq.verify();
    }

    @Test
    void groqRateLimitIsBusy() {
        groq.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).header("retry-after", "7"));

        assertThatThrownBy(() -> client.complete(MESSAGES))
                .isInstanceOf(ServiceUnavailableException.class)
                .hasMessage(GroqClient.BUSY);
    }

    @Test
    void badKeyIsUnavailableWithoutGroqsDetails() {
        groq.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"error":{"message":"Invalid API Key","type":"invalid_request_error"}}"""));

        assertThatThrownBy(() -> client.complete(MESSAGES))
                .isInstanceOf(ServiceUnavailableException.class)
                .hasMessage(GroqClient.UNAVAILABLE);
    }

    @Test
    void groqDownIsUnavailable() {
        groq.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.BAD_GATEWAY));

        assertThatThrownBy(() -> client.complete(MESSAGES))
                .isInstanceOf(ServiceUnavailableException.class)
                .hasMessage(GroqClient.UNAVAILABLE);
    }

    @Test
    void anEmptyAnswerIsUnavailable() {
        groq.expect(requestTo(URL)).andRespond(withSuccess("""
                {"choices":[]}""", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.complete(MESSAGES))
                .isInstanceOf(ServiceUnavailableException.class)
                .hasMessage(GroqClient.UNAVAILABLE);
    }
}
