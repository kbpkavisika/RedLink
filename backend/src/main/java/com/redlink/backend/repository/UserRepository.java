package com.redlink.backend.repository;

import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // Emails are stored lowercased (see Emails.normalize), so pass a normalized email
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByRole(Role role);

    // A hospital's staff, in the order they joined (the first is the person who registered it)
    List<User> findAllByHospitalIdOrderByCreatedAtAsc(Long hospitalId);
}
