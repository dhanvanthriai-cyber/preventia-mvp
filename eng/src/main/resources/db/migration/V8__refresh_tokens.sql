-- V8: Refresh token store
-- Supports the rotation pattern: each /auth/refresh call consumes the
-- existing token and issues a fresh one, invalidating the previous.
-- Expired or unknown tokens → HTTP 401 (no silent extension).

CREATE TABLE refresh_tokens (
    id         UUID         PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ  NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_token   ON refresh_tokens (token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
