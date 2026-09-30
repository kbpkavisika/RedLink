package com.redlink.backend.repository;

import com.redlink.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // Emails are stored lowercased (see Emails.normalize), so pass a normalized email
    Optional<User> findByEmail(String email);
}
