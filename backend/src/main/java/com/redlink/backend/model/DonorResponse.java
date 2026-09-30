package com.redlink.backend.model;

import com.redlink.backend.model.enums.ResponseStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;

// One row per donor per request; withdrawing updates the status of this row
@Entity
@Table(name = "donor_responses")
@Getter
@Setter
@NoArgsConstructor
public class DonorResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id")
    private BloodRequest request;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "donor_id")
    private Donor donor;

    @Enumerated(EnumType.STRING)
    private ResponseStatus status;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant respondedAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
