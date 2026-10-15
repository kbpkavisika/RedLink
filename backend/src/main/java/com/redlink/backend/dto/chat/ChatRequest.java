package com.redlink.backend.dto.chat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * POST /api/chat: the conversation so far, oldest first, ending with the user's new question.
 * The server keeps no chat history; the browser sends it each time and ChatService keeps only the latest
 * redlink.ai.groq.max-history messages. The limit of 50 here only stops oversized bodies.
 */
public record ChatRequest(
        @NotEmpty(message = "must contain at least one message")
        @Size(max = 50, message = "can contain at most 50 messages")
        List<@Valid @NotNull ChatMessage> messages
) {

    // role: "user" (the person) or "assistant" (an earlier reply)
    public record ChatMessage(
            @NotNull @Pattern(regexp = "user|assistant", message = "must be user or assistant") String role,
            @NotBlank String content
    ) {
    }
}
