package com.redlink.backend.repository;

import com.redlink.backend.model.Donor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface DonorRepository extends JpaRepository<Donor, Long> {

    // Loads each donor's user in the same query instead of one extra query per donor
    @Query("select d from Donor d join fetch d.user order by d.id")
    List<Donor> findAllWithUser();

    @Query("select d from Donor d join fetch d.user where d.id = :id")
    Optional<Donor> findByIdWithUser(Long id);
}
