package com.redlink.backend.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.redlink.backend.config.GroqProperties;
import com.redlink.backend.exception.ServiceUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;

/**
 * Talks to Groq's OpenAI-compatible chat API: POST {baseUrl}/chat/completions.
 * Any failure (Groq's rate limit, a bad key, a timeout, an empty answer) becomes a 503 with a plain message;
 * the details go to the log only, never to the user.
 */
@Component
public class GroqClient {

    private static final Logger log = LoggerFactory.getLogger(GroqClient.class);

    static final String BUSY = "The assistant is busy right now. Please try again in a minute.";
    static final String UNAVAILABLE = "The assistant isn't available right now. Please try again later.";

    // Low: answers about rules and the app should be steady, not creative
    private static final double TEMPERATURE = 0.3;

    private final GroqProperties properties;
    private final RestClient restClient;

    @Autowired
    public GroqClient(GroqProperties properties) {
        this(properties, RestClient.builder().requestFactory(requestFactory(properties.timeout())));
    }

    // Tests pass a builder bound to MockRestServiceServer
    GroqClient(GroqProperties properties, RestClient.Builder builder) {
        this.properties = properties;
        this.restClient = builder
                .baseUrl(properties.baseUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                .build();
    }

    // One message of the conversation; role is "system", "user" or "assistant"
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Message(String role, String content) {
    }

    // Sends the conversation and returns the model's reply
    public String complete(List<Message> messages) {
        CompletionRequest body = new CompletionRequest(properties.model(), messages, properties.maxTokens(), TEMPERATURE,
                properties.reasoningEffort());
        CompletionResponse response;
        try {
            response = restClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(CompletionResponse.class);
        } catch (HttpClientErrorException.TooManyRequests e) {
            log.warn("Groq rate limit reached (retry-after={})", e.getResponseHeaders() == null
                    ? null : e.getResponseHeaders().getFirst(HttpHeaders.RETRY_AFTER));
            throw new ServiceUnavailableException(BUSY);
        } catch (RestClientResponseException e) {
            // 401 = wrong or revoked key, 400 = e.g. a model Groq no longer offers
            log.warn("Groq answered {}: {}", e.getStatusCode().value(), shorten(e.getResponseBodyAsString()));
            throw new ServiceUnavailableException(UNAVAILABLE);
        } catch (ResourceAccessException e) {
            log.warn("Groq unreachable or too slow: {}", e.getMessage());
            throw new ServiceUnavailableException(BUSY);
        }

        String reply = response == null || response.choices() == null || response.choices().isEmpty()
                || response.choices().getFirst().message() == null
                ? null : response.choices().getFirst().message().content();
        if (reply == null || reply.isBlank()) {
            log.warn("Groq returned no reply");
            throw new ServiceUnavailableException(UNAVAILABLE);
        }
        return reply.strip();
    }

    private static JdkClientHttpRequestFactory requestFactory(Duration timeout) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(timeout).build());
        factory.setReadTimeout(timeout);
        return factory;
    }

    private static String shorten(String text) {
        return text == null || text.length() <= 300 ? text : text.substring(0, 300) + "…";
    }

    // reasoning_effort is left out when not set, as non-reasoning models refuse it
    record CompletionRequest(String model, List<Message> messages,
                             @JsonProperty("max_tokens") int maxTokens, double temperature,
                             @JsonProperty("reasoning_effort") @JsonInclude(JsonInclude.Include.NON_NULL)
                             String reasoningEffort) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record CompletionResponse(List<Choice> choices) {

        @JsonIgnoreProperties(ignoreUnknown = true)
        record Choice(Message message) {
        }
    }
}
