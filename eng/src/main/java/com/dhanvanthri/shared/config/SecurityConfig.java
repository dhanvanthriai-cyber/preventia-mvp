package com.dhanvanthri.shared.config;

import com.dhanvanthri.auth.service.UserDetailsServiceImpl;
import com.dhanvanthri.shared.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security 3.x configuration for Project Dhanvanthri.
 *
 * Design decisions:
 * - Stateless JWT sessions (no HTTP session created or maintained)
 * - DaoAuthenticationProvider wires UserDetailsServiceImpl + BCrypt together
 * - @EnableMethodSecurity enables @PreAuthorize on controllers for role-gated endpoints
 * - Public paths: /api/v1/auth/** (login/register) and /actuator/health (load-balancer probe)
 */
@Configuration
@EnableMethodSecurity   // enables @PreAuthorize on controllers
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsServiceImpl userDetailsServiceImpl;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter,
                          UserDetailsServiceImpl userDetailsServiceImpl) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsServiceImpl = userDetailsServiceImpl;
    }

    // -------------------------------------------------------------------------
    // UserDetailsService — exposes the impl as a named Spring bean so that
    // Spring Security's auto-configuration and the DaoAuthenticationProvider
    // both pick up the same instance.
    // -------------------------------------------------------------------------
    @Bean
    public UserDetailsService userDetailsService() {
        return userDetailsServiceImpl;
    }

    // -------------------------------------------------------------------------
    // PasswordEncoder — BCrypt with default strength (10 rounds).
    // Shared by DaoAuthenticationProvider and AuthService registration flow.
    // -------------------------------------------------------------------------
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // -------------------------------------------------------------------------
    // DaoAuthenticationProvider — bridges UserDetailsService + PasswordEncoder
    // so AuthenticationManager.authenticate() performs DB lookup + hash verify.
    // -------------------------------------------------------------------------
    @Bean
    public DaoAuthenticationProvider daoAuthenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService());
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    // -------------------------------------------------------------------------
    // AuthenticationManager — standard Spring Security 3.x pattern.
    // Delegates to DaoAuthenticationProvider via AuthenticationConfiguration.
    // -------------------------------------------------------------------------
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    // -------------------------------------------------------------------------
    // Security filter chain — stateless JWT, no CSRF, role-gated by path.
    // -------------------------------------------------------------------------
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(daoAuthenticationProvider())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/api/v1/webhook/daily").permitAll()    // Daily.co webhook (legacy path)
                .requestMatchers("/webhooks/daily").permitAll()          // Daily.co HMAC-verified webhook — no JWT
                .requestMatchers("/api/v1/webhook/lab").permitAll()     // Thyrocare lab webhook — no JWT
                .requestMatchers("/api/v1/webhook/stripe").permitAll()  // Stripe payment webhook — no JWT
                .requestMatchers("/api/v1/webhook/razorpay").permitAll() // Razorpay payment webhook — no JWT
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
