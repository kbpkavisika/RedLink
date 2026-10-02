package com.redlink.backend.repository;

import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.Role;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // Emails are stored lowercased (see Emails.normalize), so pass a normalized email
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByRole(Role role);

    // A hospital's staff, in the order they joined (the first is the person who registered it)
    List<User> findAllByHospitalIdOrderByCreatedAtAsc(Long hospitalId);

    /**
     * The admin's user list: optionally one role, optionally names or emails containing the search text.
     * pattern is a lowercased LIKE pattern such as "%kamal%" ("%" matches everyone); "\" escapes % and _.
     * The hospital is fetched in the same query, so listing staff doesn't run one query per user.
     */
    @Query("""
            select u from User u left join fetch u.hospital
            where (:role is null or u.role = :role)
              and (lower(u.fullName) like :pattern escape '\\' or u.email like :pattern escape '\\')
            order by u.createdAt desc, u.id desc""")
    List<User> search(Role role, String pattern, Limit limit);
}
