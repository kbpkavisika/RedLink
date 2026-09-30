package com.redlink.backend.model;

import com.redlink.backend.model.enums.Role;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;
    private String passwordHash;
    private String fullName;
    private String phone;

    @Enumerated(EnumType.STRING)
    private Role role;

    // Only set for HOSPITAL_STAFF (enforced by ck_users_hospital)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospital_id")
    private Hospital hospital;

    private boolean enabled = true;
    private boolean mustChangePassword = false;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;
}
