package com.preventia.shared.config;

import com.preventia.auth.service.UserDetailsServiceImpl;
import com.preventia.shared.security.JwtAuthFilter;
import jakarta.servlet.DispatcherType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Spring Security 3.x configuration for Project Preventia.
 *
 * Key design decisions:
 * - AuthenticationManager is built explicitly via ProviderManager so there is
 *   exactly ONE provider wired — avoids the "2 UserDetailsService beans" warning
 *   that caused Spring Security's GlobalAuthenticationManager to skip password login.
 * - No @Bean wrapper for UserDetailsService — UserDetailsServiceImpl is already
 *   a @Service; exposing a second wrapper created the duplicate-bean conflict.
 * - Stateless JWT — no HTTP session.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsServiceImpl userDetailsServiceImpl;
    private final List<String> corsAllowedOriginPatterns;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter,
                          UserDetailsServiceImpl userDetailsServiceImpl,
                          @Value("${app.cors.allowed-origin-patterns:http://localhost:3000,http://127.0.0.1:3000,http://localhost:19006,http://127.0.0.1:19006,http://localhost:8081,http://127.0.0.1:8081,http://localhost:8080,https://*.ap-south-1.awsapprunner.com}") String corsAllowedOriginPatterns) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsServiceImpl = userDetailsServiceImpl;
        this.corsAllowedOriginPatterns = Arrays.stream(corsAllowedOriginPatterns.split(","))
            .map(String::trim)
            .filter(pattern -> !pattern.isEmpty())
            .toList();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Explicit ProviderManager — DaoAuthenticationProvider is created locally (not a @Bean)
     * so Spring Security sees exactly one UserDetailsService and wires login correctly.
     */
    @Bean
    public AuthenticationManager authenticationManager() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsServiceImpl);
        provider.setPasswordEncoder(passwordEncoder());
        return new ProviderManager(provider);
    }

    @Bean
    @Order(1)
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            )
            .authorizeHttpRequests(auth -> auth
                .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                .requestMatchers("/api/v1/webhook/daily").permitAll()
                .requestMatchers("/webhooks/daily").permitAll()
                .requestMatchers("/api/v1/webhook/lab").permitAll()
                .requestMatchers("/api/v1/webhook/stripe").permitAll()
                .requestMatchers("/api/v1/webhook/razorpay").permitAll()
                .requestMatchers("/webhooks/razorpay").permitAll()
                .requestMatchers("/api/v1/webhooks/stream").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(corsAllowedOriginPatterns);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
