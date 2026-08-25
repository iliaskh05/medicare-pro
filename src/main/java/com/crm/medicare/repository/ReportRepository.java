package com.crm.medicare.repository;

import com.crm.medicare.entity.Report;
import com.crm.medicare.workflow.ReportStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReportRepository extends JpaRepository<Report, Long> {

    Optional<Report> findByExamenId(Long examenId);

    boolean existsByExamenId(Long examenId);

    @Query(
            """
            SELECT DISTINCT r FROM Report r
            JOIN FETCH r.examen e
            JOIN FETCH e.patient p
            LEFT JOIN FETCH e.catalogue
            WHERE (:patientId IS NULL OR p.id = :patientId)
              AND (:status IS NULL OR r.status = :status)
            ORDER BY r.createdAt DESC
            """)
    List<Report> findAllFiltered(
            @Param("patientId") Long patientId, @Param("status") ReportStatus status);

    @Query(
            """
            SELECT r FROM Report r
            JOIN FETCH r.examen e
            JOIN FETCH e.patient
            LEFT JOIN FETCH e.catalogue
            WHERE r.id = :id
            """)
    Optional<Report> findByIdWithDetails(@Param("id") Long id);
}
