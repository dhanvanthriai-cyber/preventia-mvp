package com.preventia.auth.repository;

import com.preventia.family.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByGoogleSubject(String googleSubject);
    Optional<User> findByAppleSubject(String appleSubject);
    boolean existsByEmail(String email);
    List<User> findAllByRoleOrderByNameAsc(User.Role role);
    long countByRole(User.Role role);
}
