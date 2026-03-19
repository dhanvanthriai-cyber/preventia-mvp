package com.preventia.shared.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);
    private final JwtTokenProvider jwtProvider;

    public JwtAuthFilter(JwtTokenProvider jwtProvider) {
        this.jwtProvider = jwtProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain)
        throws ServletException, IOException {

        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            boolean valid = jwtProvider.validateToken(token);
            log.debug("[JwtAuthFilter] {} {} token_len={} valid={}",
                req.getMethod(), req.getRequestURI(), token.length(), valid);
            if (valid) {
                String email = jwtProvider.getUserEmail(token);
                String role  = jwtProvider.getRole(token);
                var auth = new UsernamePasswordAuthenticationToken(
                    email, null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role))
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
                log.debug("[JwtAuthFilter] authenticated {} as ROLE_{}", email, role);
            } else {
                log.warn("[JwtAuthFilter] {} {} — token INVALID (length={})",
                    req.getMethod(), req.getRequestURI(), token.length());
            }
        } else {
            log.debug("[JwtAuthFilter] {} {} — no Bearer header", req.getMethod(), req.getRequestURI());
        }
        chain.doFilter(req, res);
    }
}
