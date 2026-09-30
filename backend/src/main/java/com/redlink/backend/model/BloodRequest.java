package com.redlink.backend.model;

import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.model.enums.Urgency;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "blood_requests")
@Getter
@Setter
@NoArgsConstructor
public class BloodRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "hospital_id")
    private Hospital hospital;

    // Staff member who posted it
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by")
    private User createdBy;

    private BloodGroup bloodGroup;
    private int unitsNeeded;

    @Enumerated(EnumType.STRING)
    private Urgency urgency;

    private String city;

    @Enumerated(EnumType.STRING)
    private RequestStatus status = RequestStatus.OPEN;

    private Instant neededBy;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    // Set when the status leaves OPEN (enforced by ck_requests_closed_at)
    private Instant closedAt;
}
