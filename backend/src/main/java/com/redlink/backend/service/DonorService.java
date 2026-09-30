package com.redlink.backend.service;

import com.redlink.backend.dto.DonorSummary;
import com.redlink.backend.exception.NotFoundException;
import com.redlink.backend.repository.DonorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

// Read-only by default; methods that write get their own @Transactional
@Service
@Transactional(readOnly = true)
public class DonorService {

    private final DonorRepository donorRepository;

    public DonorService(DonorRepository donorRepository) {
        this.donorRepository = donorRepository;
    }

    public List<DonorSummary> findAll() {
        return donorRepository.findAllWithUser().stream()
                .map(DonorSummary::from)
                .toList();
    }

    public DonorSummary findById(Long id) {
        return donorRepository.findByIdWithUser(id)
                .map(DonorSummary::from)
                .orElseThrow(() -> new NotFoundException("Donor " + id + " was not found."));
    }
}
