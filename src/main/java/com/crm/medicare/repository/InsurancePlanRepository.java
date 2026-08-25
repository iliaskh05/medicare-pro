package com.crm.medicare.repository;

import com.crm.medicare.entity.InsurancePlan;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InsurancePlanRepository extends JpaRepository<InsurancePlan, Long> {

    List<InsurancePlan> findByActifTrueOrderByLibelleAsc();

    List<InsurancePlan> findByProviderIdOrderByLibelleAsc(Long providerId);

    @Query(
            """
            SELECT p FROM InsurancePlan p
            JOIN FETCH p.provider
            WHERE p.id = :id
            """)
    Optional<InsurancePlan> findByIdWithProvider(@Param("id") Long id);
}
