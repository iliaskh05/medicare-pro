package com.crm.medicare.repository;

import com.crm.medicare.entity.PaiementExamen;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaiementExamenRepository extends JpaRepository<PaiementExamen, Long> {

    List<PaiementExamen> findByExamenIdOrderByCreatedAtAsc(Long examenId);
}
