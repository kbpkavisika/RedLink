package com.redlink.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Who receives it
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    // Related request (optional)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id")
    private BloodRequest request;

    private String message;

    @Column(name = "is_read")
    private boolean read = false;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;
}
