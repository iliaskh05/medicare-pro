package com.crm.medicare.repository;

import com.crm.medicare.entity.ImagingStudy;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ImagingStudyRepository extends JpaRepository<ImagingStudy, Long> {

    List<ImagingStudy> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    Optional<ImagingStudy> findFirstByExamenId(Long examenId);

    @Query(
            """
            SELECT s FROM ImagingStudy s
            JOIN FETCH s.patient
            WHERE s.id = :id
            """)
    Optional<ImagingStudy> findByIdWithPatient(@Param("id") Long id);
}
