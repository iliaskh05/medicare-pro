package com.crm.medicare.repository;

import com.crm.medicare.entity.InsuranceProvider;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InsuranceProviderRepository extends JpaRepository<InsuranceProvider, Long> {

    List<InsuranceProvider> findByActifTrueOrderByNomAsc();

    Optional<InsuranceProvider> findByCodeIgnoreCase(String code);
}
