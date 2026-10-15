package com.redlink.backend.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

/**
 * Settings under "redlink.ai.groq" for the AI assistant (ChatService, GroqClient).
 * Defaults are in application.properties. The key is optional: without one the app still starts
 * and POST /api/chat answers 503, so tests and CI never call Groq.
 *
 * @param apiKey           Groq API key (console.groq.com). Never committed:
 *                         application-local.properties locally, REDLINK_AI_GROQ_API_KEY when deployed
 * @param baseUrl          Groq's OpenAI-compatible API, e.g. https://api.groq.com/openai/v1
 * @param model            the model that answers, e.g. openai/gpt-oss-120b (GET /models lists what a key can use)
 * @param reasoningEffort  for reasoning models: low, medium or high; less thinking uses fewer tokens.
 *                         Empty = not sent, for models that don't accept it
 * @param maxTokens        longest reply, in tokens, including any reasoning; keeps answers short and saves quota
 * @param timeout          how long to wait for Groq before giving up
 * @param maxHistory       how many earlier messages of the conversation are sent with each question
 * @param maxMessageLength longest message a user may send, in characters
 */
@Validated
@ConfigurationProperties(prefix = "redlink.ai.groq")
public record GroqProperties(
        String apiKey,
        @NotBlank String baseUrl,
        @NotBlank String model,
        String reasoningEffort,
        @Positive int maxTokens,
        @NotNull Duration timeout,
        @Positive int maxHistory,
        @Positive int maxMessageLength
) {

    public GroqProperties {
        apiKey = apiKey == null ? "" : apiKey.trim();
        reasoningEffort = reasoningEffort == null || reasoningEffort.isBlank() ? null : reasoningEffort.trim();
    }

    // True when a key is set; otherwise the assistant is switched off
    public boolean enabled() {
        return !apiKey.isEmpty();
    }
}
