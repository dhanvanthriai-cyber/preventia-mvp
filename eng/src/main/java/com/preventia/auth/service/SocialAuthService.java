package com.preventia.auth.service;

import com.preventia.auth.domain.RefreshToken;
import com.preventia.auth.dto.JwtResponse;
import com.preventia.auth.dto.SocialLoginRequest;
import com.preventia.auth.repository.UserRepository;
import com.preventia.family.domain.User;
import com.preventia.shared.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class SocialAuthService {

    private static final String GOOGLE_JWK_SET_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final String APPLE_JWK_SET_URI = "https://appleid.apple.com/auth/keys";
    private static final Set<String> GOOGLE_ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");
    private static final String APPLE_ISSUER = "https://appleid.apple.com";

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtProvider;
    private final RefreshTokenService refreshTokenService;
    private final String googleClientId;
    private final String appleClientId;
    private final NimbusJwtDecoder googleJwtDecoder;
    private final NimbusJwtDecoder appleJwtDecoder;

    public SocialAuthService(UserRepository userRepo,
                             PasswordEncoder passwordEncoder,
                             JwtTokenProvider jwtProvider,
                             RefreshTokenService refreshTokenService,
                             @Value("${app.auth.google.client-id:}") String googleClientId,
                             @Value("${app.auth.apple.client-id:}") String appleClientId) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
        this.refreshTokenService = refreshTokenService;
        this.googleClientId = googleClientId == null ? "" : googleClientId.trim();
        this.appleClientId = appleClientId == null ? "" : appleClientId.trim();
        this.googleJwtDecoder = buildDecoder(GOOGLE_JWK_SET_URI);
        this.appleJwtDecoder = buildDecoder(APPLE_JWK_SET_URI);
    }

    @Transactional
    public JwtResponse authenticateWithGoogle(SocialLoginRequest request) {
        SocialIdentity identity = verifyGoogleToken(request.idToken());
        return authenticateOrCreateUser(SocialProvider.GOOGLE, identity, request.role());
    }

    @Transactional
    public JwtResponse authenticateWithApple(SocialLoginRequest request) {
        SocialIdentity identity = verifyAppleToken(request);
        return authenticateOrCreateUser(SocialProvider.APPLE, identity, request.role());
    }

    private JwtResponse authenticateOrCreateUser(SocialProvider provider, SocialIdentity identity, User.Role requestedRole) {
        if (requestedRole == User.Role.ADMIN) {
            throw new UnsupportedOperationException("Admin accounts cannot be created through public social sign-in.");
        }

        User user = resolveUser(provider, identity, requestedRole);
        Authentication auth = new UsernamePasswordAuthenticationToken(user.getEmail(), null, List.of());
        String accessToken = jwtProvider.generateToken(auth, user.getRole().name(), user.getId());
        RefreshToken refreshToken = refreshTokenService.createForUser(user);

        return new JwtResponse(
            accessToken,
            jwtProvider.getExpirationSeconds(),
            user.getRole().name(),
            refreshToken.getToken()
        );
    }

    private User resolveUser(SocialProvider provider, SocialIdentity identity, User.Role requestedRole) {
        Optional<User> existingBySubject = findByProviderSubject(provider, identity.subject());
        if (existingBySubject.isPresent()) {
            return existingBySubject.get();
        }

        Optional<User> existingByEmail = userRepo.findByEmail(identity.email());
        if (existingByEmail.isPresent()) {
            User user = existingByEmail.get();
            if (user.getRole() == User.Role.ADMIN) {
                throw new UnsupportedOperationException("Admin accounts must continue using their managed sign-in flow.");
            }
            if (provider == SocialProvider.GOOGLE && !identity.emailAuthoritative()) {
                throw new UnsupportedOperationException(
                    "This Google account cannot be linked automatically for that email. Please sign in with your password first."
                );
            }
            attachProviderSubject(user, provider, identity.subject());
            if (isBlank(user.getName()) && !isBlank(identity.displayName())) {
                user.setName(identity.displayName());
            }
            return userRepo.save(user);
        }

        User user = new User();
        user.setName(resolveDisplayName(identity));
        user.setEmail(identity.email());
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setRole(requestedRole);
        attachProviderSubject(user, provider, identity.subject());
        return userRepo.save(user);
    }

    private Optional<User> findByProviderSubject(SocialProvider provider, String subject) {
        return switch (provider) {
            case GOOGLE -> userRepo.findByGoogleSubject(subject);
            case APPLE -> userRepo.findByAppleSubject(subject);
        };
    }

    private void attachProviderSubject(User user, SocialProvider provider, String subject) {
        if (provider == SocialProvider.GOOGLE) {
            if (!isBlank(user.getGoogleSubject()) && !user.getGoogleSubject().equals(subject)) {
                throw new UnsupportedOperationException("This email is already linked to a different Google account.");
            }
            user.setGoogleSubject(subject);
        } else {
            if (!isBlank(user.getAppleSubject()) && !user.getAppleSubject().equals(subject)) {
                throw new UnsupportedOperationException("This email is already linked to a different Apple account.");
            }
            user.setAppleSubject(subject);
        }
    }

    private SocialIdentity verifyGoogleToken(String idToken) {
        if (googleClientId.isBlank()) {
            throw new UnsupportedOperationException("Google sign-in is not configured.");
        }

        Jwt jwt = decodeToken(googleJwtDecoder, idToken, "Google");
        String issuer = jwt.getIssuer() == null ? "" : jwt.getIssuer().toString();
        if (!GOOGLE_ISSUERS.contains(issuer)) {
            throw new IllegalArgumentException("Invalid Google token issuer.");
        }
        if (!jwt.getAudience().contains(googleClientId)) {
            throw new IllegalArgumentException("Google token was issued for a different client.");
        }

        String email = normalizeEmail(jwt.getClaimAsString("email"));
        if (email == null) {
            throw new IllegalArgumentException("Google did not return an email address.");
        }
        if (!asBoolean(jwt.getClaims().get("email_verified"))) {
            throw new IllegalArgumentException("Google account email is not verified.");
        }

        String subject = jwt.getSubject();
        if (isBlank(subject)) {
            throw new IllegalArgumentException("Google token subject is missing.");
        }

        boolean authoritativeEmail = email.endsWith("@gmail.com")
            || !isBlank(jwt.getClaimAsString("hd"));

        return new SocialIdentity(
            subject,
            email,
            cleanName(jwt.getClaimAsString("name")),
            authoritativeEmail
        );
    }

    private SocialIdentity verifyAppleToken(SocialLoginRequest request) {
        if (appleClientId.isBlank()) {
            throw new UnsupportedOperationException("Apple sign-in is not configured.");
        }

        Jwt jwt = decodeToken(appleJwtDecoder, request.idToken(), "Apple");
        String issuer = jwt.getIssuer() == null ? "" : jwt.getIssuer().toString();
        if (!APPLE_ISSUER.equals(issuer)) {
            throw new IllegalArgumentException("Invalid Apple token issuer.");
        }
        if (!jwt.getAudience().contains(appleClientId)) {
            throw new IllegalArgumentException("Apple token was issued for a different client.");
        }

        String email = normalizeEmail(jwt.getClaimAsString("email"));
        if (email == null) {
            throw new IllegalArgumentException("Apple did not return an email address.");
        }
        if (!asBoolean(jwt.getClaims().get("email_verified"))) {
            throw new IllegalArgumentException("Apple account email is not verified.");
        }

        String subject = jwt.getSubject();
        if (isBlank(subject)) {
            throw new IllegalArgumentException("Apple token subject is missing.");
        }

        String displayName = cleanName(request.fullName());
        return new SocialIdentity(subject, email, displayName, true);
    }

    private Jwt decodeToken(NimbusJwtDecoder decoder, String idToken, String providerName) {
        try {
            return decoder.decode(idToken);
        } catch (JwtException ex) {
            throw new IllegalArgumentException("Invalid " + providerName + " identity token.", ex);
        }
    }

    private NimbusJwtDecoder buildDecoder(String jwkSetUri) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        decoder.setJwtValidator(JwtValidators.createDefault());
        return decoder;
    }

    private boolean asBoolean(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof String str) {
            return "true".equalsIgnoreCase(str) || "1".equals(str);
        }
        return false;
    }

    private String resolveDisplayName(SocialIdentity identity) {
        if (!isBlank(identity.displayName())) {
            return identity.displayName();
        }

        String email = identity.email();
        int atIndex = email.indexOf('@');
        String localPart = atIndex > 0 ? email.substring(0, atIndex) : email;
        String normalized = Normalizer.normalize(localPart, Normalizer.Form.NFKC)
            .replaceAll("[._-]+", " ")
            .replaceAll("\\s+", " ")
            .trim();
        if (normalized.isEmpty()) {
            return "Preventia User";
        }
        return Arrays.stream(normalized.split(" "))
            .filter(part -> !part.isBlank())
            .map(part -> part.substring(0, 1).toUpperCase(Locale.ROOT) + part.substring(1))
            .reduce((left, right) -> left + " " + right)
            .orElse("Preventia User");
    }

    private String cleanName(String value) {
        if (isBlank(value)) {
            return null;
        }
        return value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeEmail(String email) {
        if (isBlank(email)) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private enum SocialProvider {
        GOOGLE,
        APPLE
    }

    private record SocialIdentity(
        String subject,
        String email,
        String displayName,
        boolean emailAuthoritative
    ) {}
}
