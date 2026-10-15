package com.redlink.backend.controller;

import com.redlink.backend.dto.chat.ChatReply;
import com.redlink.backend.dto.chat.ChatRequest;
import com.redlink.backend.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// The AI assistant. Any role: SecurityConfig only requires a valid token here.
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    // {"messages":[{"role":"user","content":"Who can donate blood?"}]} → {"reply":"..."}
    @PostMapping
    public ChatReply chat(@Valid @RequestBody ChatRequest request) {
        return chatService.reply(request);
    }
}
