package com.preventia.auth.service;

import com.preventia.auth.repository.UserRepository;
import com.preventia.family.domain.User;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Spring Security UserDetailsService implementation.
 *
 * Loads a {@link User} by email (which serves as the username in this system)
 * and maps the domain {@link User.Role} to a single Spring Security authority
 * using the standard {@code ROLE_} prefix convention.
 *
 * Authority format: {@code ROLE_RECIPIENT}, {@code ROLE_SPONSOR},
 *                   {@code ROLE_DOCTOR}, {@code ROLE_PHARMACIST}, {@code ROLE_ADMIN}
 *
 * Used by {@link org.springframework.security.authentication.dao.DaoAuthenticationProvider}
 * during login and by the JWT filter on every authenticated request.
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException(
                "No account found for email: " + email));

        return org.springframework.security.core.userdetails.User.builder()
            .username(user.getEmail())
            .password(user.getPassword())
            .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
            .build();
    }
}
