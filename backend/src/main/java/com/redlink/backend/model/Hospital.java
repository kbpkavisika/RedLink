package com.redlink.backend.model;

import com.redlink.backend.model.enums.HospitalStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "hospitals")
@Getter
@Setter
@NoArgsConstructor
public class Hospital {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String registrationNo;
    private String address;
    private String city;
    private String phone;

    @Enumerated(EnumType.STRING)
    private HospitalStatus status = HospitalStatus.PENDING;

    // The admin who approved or rejected it
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    private Instant approvedAt;
    private String rejectionReason;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;
}
