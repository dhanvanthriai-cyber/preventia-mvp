package com.dhanvanthri.chat.controller;

import com.dhanvanthri.auth.repository.UserRepository;
import com.dhanvanthri.chat.dto.ChatTokenResponse;
import com.dhanvanthri.chat.service.StreamChatService;
import com.dhanvanthri.family.domain.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * ChatController — issues Stream Chat user tokens.
 *
 * The endpoint is protected by Spring Security's JWT filter (all
 * non-whitelisted paths require a valid JWT).  The authenticated principal's
 * email is used to look up the full User record so the Stream token carries
 * the correct userId.
 *
 * No additional SecurityConfig entry needed — /api/v1/chat/** is covered by
 * the catch-all `.anyRequest().authenticated()` rule.
 */
@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private final StreamChatService streamChatService;
    private final UserRepository    userRepository;

    public ChatController(StreamChatService streamChatService,
                          UserRepository userRepository) {
        this.streamChatService = streamChatService;
        this.userRepository    = userRepository;
    }

    /**
     * GET /api/v1/chat/token
     *
     * Returns a Stream Chat user token for the currently authenticated user.
     * The client uses this to call {@code StreamChat.connectUser()} on the
     * web and mobile SDKs.
     *
     * Response:
     * <pre>
     * {
     *   "token":  "eyJ...",
     *   "userId": "42",
     *   "apiKey": "9mb2bz..."
     * }
     * </pre>
     */
    @GetMapping("/token")
    public ResponseEntity<ChatTokenResponse> getChatToken(Authentication authentication) {
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + email));

        ChatTokenResponse response = streamChatService.generateToken(
            user.getId(),
            user.getName(),
            user.getRole().name()
        );

        return ResponseEntity.ok(response);
    }
}
