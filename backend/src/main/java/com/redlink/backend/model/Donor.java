package com.redlink.backend.model;

import com.redlink.backend.model.enums.BloodGroup;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDate;

@Entity
@Table(name = "donors")
@Getter
@Setter
@NoArgsConstructor
public class Donor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Name, phone and email live on the user
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    private BloodGroup bloodGroup;
    private LocalDate dateOfBirth;
    private String city;
    private boolean available = true;
    private LocalDate lastDonationDate;
}
