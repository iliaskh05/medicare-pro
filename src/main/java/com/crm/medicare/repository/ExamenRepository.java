package com.crm.medicare.repository;

import com.crm.medicare.entity.EtatPatient;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.StatutCr;
import com.crm.medicare.workflow.EncounterStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ExamenRepository extends JpaRepository<Examen, Long> {

    @Query(
            """
            SELECT e FROM Examen e
            JOIN FETCH e.patient p
            LEFT JOIN FETCH e.prescripteur
            WHERE e.dateExamen >= :debut AND e.dateExamen < :fin
              AND (
                :search IS NULL OR :search = ''
                OR LOWER(p.nomComplet) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(e.numSejour) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(p.cin, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
              AND (:status IS NULL OR e.etatPatient = :status)
            ORDER BY e.dateExamen ASC
            """)
    List<Examen> searchWorklist(
            @Param("debut") LocalDateTime debut,
            @Param("fin") LocalDateTime fin,
            @Param("search") String search,
            @Param("status") EtatPatient status);

    @Query(
            """
            SELECT e FROM Examen e
            JOIN FETCH e.patient
            LEFT JOIN FETCH e.prescripteur
            WHERE e.id = :id
            """)
    Optional<Examen> findByIdWithPatient(@Param("id") Long id);

    long countByNumSejourStartingWith(String prefix);

    long countByEtatPatient(EtatPatient etatPatient);

    long countByDateExamenGreaterThanEqualAndDateExamenLessThan(
            LocalDateTime debut, LocalDateTime fin);

    @Query(
            """
            SELECT e FROM Examen e
            WHERE e.etatPatient = :etat
            """)
    List<Examen> findAllByEtatPatient(@Param("etat") EtatPatient etat);

    @Query(
            """
            SELECT e FROM Examen e
            JOIN FETCH e.patient
            LEFT JOIN FETCH e.prescripteur
            WHERE e.patient.id = :patientId
            ORDER BY e.dateExamen DESC
            """)
    List<Examen> findByPatientIdOrderByDateExamenDesc(@Param("patientId") Long patientId);

    @Query(
            """
            SELECT e FROM Examen e
            JOIN FETCH e.patient
            LEFT JOIN FETCH e.prescripteur
            LEFT JOIN FETCH e.assignedRadiologue
            WHERE e.dateExamen >= :debut AND e.dateExamen < :fin
            ORDER BY e.dateExamen ASC
            """)
    List<Examen> findWithPatientByDateRange(
            @Param("debut") LocalDateTime debut, @Param("fin") LocalDateTime fin);

    @Query(
            """
            SELECT COALESCE(SUM(e.montant), 0) FROM Examen e
            WHERE e.dateExamen >= :debut AND e.dateExamen < :fin
              AND e.montant IS NOT NULL
              AND e.montant > 0
              AND e.cancelledAt IS NULL
              AND (e.workflowStatus IS NULL OR e.workflowStatus NOT IN :excluded)
            """)
    BigDecimal sumRecordedMontantBetween(
            @Param("debut") LocalDateTime debut,
            @Param("fin") LocalDateTime fin,
            @Param("excluded") Collection<EncounterStatus> excluded);

    @Query(
            """
            SELECT e FROM Examen e
            JOIN FETCH e.patient
            WHERE e.dateExamen < :before
              AND e.statutCr IN :statuts
              AND e.cancelledAt IS NULL
              AND (e.workflowStatus IS NULL OR e.workflowStatus NOT IN :excluded)
            ORDER BY e.dateExamen ASC
            """)
    List<Examen> findPendingReportsBefore(
            @Param("before") LocalDateTime before,
            @Param("statuts") Collection<StatutCr> statuts,
            @Param("excluded") Collection<EncounterStatus> excluded);
}
