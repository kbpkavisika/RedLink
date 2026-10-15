package com.redlink.backend.service;

import com.redlink.backend.config.GroqProperties;
import com.redlink.backend.dto.chat.ChatReply;
import com.redlink.backend.dto.chat.ChatRequest;
import com.redlink.backend.exception.BadRequestException;
import com.redlink.backend.exception.ServiceUnavailableException;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.security.AuthRateLimiter;
import com.redlink.backend.security.CurrentUser;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * The AI assistant: answers questions about blood donation and how to use RedLink.
 *
 *   assistant switched off (no key) → 503
 *   → check the conversation (400) → per-account rate limit (429)
 *   → system prompt + the latest messages → Groq → reply
 *
 * Nothing is stored. Groq gets only the conversation and the user's role, never names, emails,
 * phone numbers or any other data from our database.
 */
@Service
public class ChatService {

    // Earlier replies came from Groq, not the user, so they're cut rather than refused if a client sends them long
    private static final int MAX_ASSISTANT_MESSAGE_LENGTH = 4_000;

    private final GroqProperties properties;
    private final GroqClient groqClient;
    private final CurrentUser currentUser;
    private final AuthRateLimiter rateLimiter;

    public ChatService(GroqProperties properties, GroqClient groqClient, CurrentUser currentUser,
                       AuthRateLimiter rateLimiter) {
        this.properties = properties;
        this.groqClient = groqClient;
        this.currentUser = currentUser;
        this.rateLimiter = rateLimiter;
    }

    public ChatReply reply(ChatRequest request) {
        if (!properties.enabled()) {
            throw new ServiceUnavailableException(GroqClient.UNAVAILABLE);
        }
        User user = currentUser.require();

        List<ChatRequest.ChatMessage> conversation = request.messages();
        if (!"user".equals(conversation.getLast().role())) {
            throw new BadRequestException("The last message must be your question.");
        }
        for (ChatRequest.ChatMessage message : conversation) {
            if ("user".equals(message.role()) && message.content().strip().length() > properties.maxMessageLength()) {
                throw new BadRequestException("Messages can be at most " + properties.maxMessageLength() + " characters.",
                        "messages", "a message is too long");
            }
        }
        // Counted only once the question is valid, so a mistake doesn't use up the user's limit
        rateLimiter.checkChat(user.getId());

        List<GroqClient.Message> messages = new ArrayList<>();
        messages.add(new GroqClient.Message("system", systemPrompt(user.getRole())));
        int from = Math.max(0, conversation.size() - properties.maxHistory());
        for (ChatRequest.ChatMessage message : conversation.subList(from, conversation.size())) {
            String content = message.content().strip();
            if ("assistant".equals(message.role()) && content.length() > MAX_ASSISTANT_MESSAGE_LENGTH) {
                content = content.substring(0, MAX_ASSISTANT_MESSAGE_LENGTH);
            }
            messages.add(new GroqClient.Message(message.role(), content));
        }
        return new ChatReply(groqClient.complete(messages));
    }

    // What the model is told before the conversation: who it is, what RedLink does, and what it must not do
    static String systemPrompt(Role role) {
        return """
                You are the RedLink assistant, built into RedLink: a web app in Sri Lanka that connects hospitals \
                that need blood with suitable donors.

                The person you are talking to is signed in as %s.

                How RedLink works:
                - Roles: donors, hospital staff and admins.
                - Donors register with their blood group, date of birth and city. They must be 18 to 60 years old.
                - A donor is matched only while marked available and at least 90 days after their last donation.
                - Hospitals register, and an admin must approve them before their staff can post blood requests.
                - Staff post a request with blood group, units needed, urgency (low, medium, high, critical), \
                needed-by time and city. RedLink finds compatible, available, eligible donors, ranks them \
                (exact blood group first, then same city, then longest since last donation) and notifies the top matches.
                - Donors see requests on their Requests page and accept or decline once. After accepting they can \
                withdraw while the request is open.
                - Staff close a request as fulfilled (choosing the donors who gave blood, which records the donation \
                and starts their 90-day wait) or cancelled. Open requests past their needed-by time expire automatically.
                - Notifications appear under the bell icon in the top bar.
                - Donor pages: Home, Requests, History, Profile (availability is set on Profile). \
                Staff pages: Dashboard, Requests. Admin pages: Hospital approvals, Users, Requests, Donors.
                - Nobody, admins included, can see or change another user's password. There is no password reset \
                by email yet.

                Rules:
                - Only help with blood donation in general and with using RedLink. For anything else, say politely \
                that you can only help with those.
                - You are not a doctor. Give general information only; never diagnose or tell someone they \
                definitely can or can't donate. The staff at the donation decide, so suggest asking them or a doctor.
                - In an emergency, tell the person to call 1990 (Suwa Seriya ambulance) or go to the nearest hospital.
                - You can't see or change anyone's account, requests or data. Explain where in the app to do it instead.
                - Never ask for passwords or personal details.
                - Keep answers short and plain. Reply in the language the person writes in (English, Sinhala or Tamil).
                - Write plain text: no Markdown, headings, bold or tables. For a list, start each line with "- ".
                - If you don't know, say so rather than guess.
                """.formatted(describe(role));
    }

    private static String describe(Role role) {
        return switch (role) {
            case DONOR -> "a donor";
            case HOSPITAL_STAFF -> "hospital staff";
            case ADMIN -> "an admin";
        };
    }
}
