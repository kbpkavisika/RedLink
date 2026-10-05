package com.redlink.backend.repository;

import com.redlink.backend.model.DonorResponse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface DonorResponseRepository extends JpaRepository<DonorResponse, Long> {

    // A donor's own replies to the given requests, so a list can show "You accepted" next to each
    List<DonorResponse> findByDonorIdAndRequestIdIn(Long donorId, Collection<Long> requestIds);
}
