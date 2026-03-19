package com.preventia.chat.dto;

/**
 * Returned by GET /api/v1/chat/token.
 *
 * The client uses:
 *  - token   → connect to Stream Chat as the authenticated user
 *  - userId  → required by stream-chat JS/RN SDK for connectUser()
 *  - apiKey  → required by stream-chat JS/RN SDK for StreamChat.getInstance()
 */
public record ChatTokenResponse(
    String token,
    String userId,
    String apiKey
) {}
