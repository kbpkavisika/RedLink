package com.redlink.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDate;

@Entity
@Table(name = "donations")
@Getter
@Setter
@NoArgsConstructor
public class Donation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "donor_id")
    private Donor donor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "hospital_id")
    private Hospital hospital;

    // The request it fulfilled (optional)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id")
    private BloodRequest request;

    private LocalDate donationDate;
    private int units = 1;
}
