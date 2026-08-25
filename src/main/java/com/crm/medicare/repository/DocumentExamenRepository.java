package com.crm.medicare.repository;

import com.crm.medicare.entity.DocumentExamen;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentExamenRepository extends JpaRepository<DocumentExamen, Long> {

    List<DocumentExamen> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    List<DocumentExamen> findByExamenIdOrderByCreatedAtDesc(Long examenId);
}
