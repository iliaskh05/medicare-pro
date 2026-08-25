package com.crm.medicare.repository;

import com.crm.medicare.entity.EtatPatient;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.Paiement;
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

    /**
     * Worklist search. Patterns are pre-built in Java ({@code %term%}, already lowercased) to avoid
     * Hibernate 6 + PostgreSQL typing CONCAT/empty-string literals as {@code bytea} (lower(bytea)).
     */
    @Query(
            """
            SELECT e FROM Examen e
            JOIN FETCH e.patient p
            LEFT JOIN FETCH e.prescripteur
            LEFT JOIN FETCH e.catalogue
            LEFT JOIN FETCH e.assignedRadiologue
            LEFT JOIN FETCH e.resource
            WHERE e.dateExamen >= :debut AND e.dateExamen < :fin
              AND (
                :searchPattern IS NULL
                OR LOWER(p.nomComplet) LIKE CAST(:searchPattern AS string)
                OR LOWER(e.numSejour) LIKE CAST(:searchPattern AS string)
                OR (p.cin IS NOT NULL AND LOWER(p.cin) LIKE CAST(:searchPattern AS string))
              )
              AND (:status IS NULL OR e.etatPatient = :status)
              AND (:modalite IS NULL OR e.modalite = :modalite)
              AND (:priorite IS NULL OR LOWER(e.priorite) = CAST(:priorite AS string))
              AND (:radiologueId IS NULL OR e.assignedRadiologue.id = :radiologueId)
            ORDER BY e.dateExamen ASC
            """)
    List<Examen> searchWorklist(
            @Param("debut") LocalDateTime debut,
            @Param("fin") LocalDateTime fin,
            @Param("searchPattern") String searchPattern,
            @Param("status") EtatPatient status,
            @Param("modalite") com.crm.medicare.entity.Modalite modalite,
            @Param("priorite") String priorite,
            @Param("radiologueId") Long radiologueId);

    @Query(
            """
            SELECT e.id FROM Examen e
            JOIN e.patient p
            WHERE e.dateExamen >= :debut AND e.dateExamen < :fin
              AND (
                :searchPattern IS NULL
                OR LOWER(p.nomComplet) LIKE CAST(:searchPattern AS string)
                OR LOWER(e.numSejour) LIKE CAST(:searchPattern AS string)
                OR (p.cin IS NOT NULL AND LOWER(p.cin) LIKE CAST(:searchPattern AS string))
              )
              AND (:status IS NULL OR e.etatPatient = :status)
              AND (:modalite IS NULL OR e.modalite = :modalite)
              AND (:priorite IS NULL OR LOWER(e.priorite) = CAST(:priorite AS string))
              AND (:radiologueId IS NULL OR e.assignedRadiologue.id = :radiologueId)
            ORDER BY e.dateExamen ASC
            """)
    org.springframework.data.domain.Page<Long> searchWorklistIds(
            @Param("debut") LocalDateTime debut,
            @Param("fin") LocalDateTime fin,
            @Param("searchPattern") String searchPattern,
            @Param("status") EtatPatient status,
            @Param("modalite") com.crm.medicare.entity.Modalite modalite,
            @Param("priorite") String priorite,
            @Param("radiologueId") Long radiologueId,
            org.springframework.data.domain.Pageable pageable);

    @Query(
            """
            SELECT DISTINCT e FROM Examen e
            JOIN FETCH e.patient
            LEFT JOIN FETCH e.prescripteur
            LEFT JOIN FETCH e.catalogue
            LEFT JOIN FETCH e.assignedRadiologue
            LEFT JOIN FETCH e.resource
            WHERE e.id IN :ids
            """)
    List<Examen> findAllByIdWithDetails(@Param("ids") Collection<Long> ids);

    @Query(
            """
            SELECT e FROM Examen e
            JOIN FETCH e.patient
            LEFT JOIN FETCH e.prescripteur
            LEFT JOIN FETCH e.catalogue
            WHERE e.id = :id
            """)
    Optional<Examen> findByIdWithPatient(@Param("id") Long id);

    @Query(
            """
            SELECT e FROM Examen e
            JOIN FETCH e.patient
            LEFT JOIN FETCH e.prescripteur
            LEFT JOIN FETCH e.catalogue
            LEFT JOIN FETCH e.historique
            WHERE e.id = :id
            """)
    Optional<Examen> findByIdWithHistorique(@Param("id") Long id);

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
            LEFT JOIN FETCH e.catalogue
            WHERE e.cancelledAt IS NULL AND e.dossierStatut IN :statuts
            ORDER BY e.dateExamen DESC
            """)
    List<Examen> findDossiersByStatuts(@Param("statuts") Collection<String> statuts);

    @Query(
            """
            SELECT e FROM Examen e
            JOIN FETCH e.patient
            LEFT JOIN FETCH e.prescripteur
            LEFT JOIN FETCH e.catalogue
            WHERE e.cancelledAt IS NULL
              AND e.paiement IN :paiements
              AND e.montant IS NOT NULL
              AND e.montant > 0
            ORDER BY e.dateExamen DESC
            """)
    List<Examen> findImpayes(@Param("paiements") Collection<Paiement> paiements);

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

    long countByPrescripteurId(Long prescripteurId);

    @Query(
            """
            SELECT MAX(e.dateExamen) FROM Examen e
            WHERE e.prescripteur.id = :prescripteurId
            """)
    LocalDateTime findLastExamenAtByPrescripteurId(@Param("prescripteurId") Long prescripteurId);

    @Query(
            """
            SELECT e FROM Examen e
            WHERE e.dateExamen >= :debut AND e.dateExamen < :fin
              AND e.arrivedAt IS NOT NULL
              AND e.cancelledAt IS NULL
            """)
    List<Examen> findWithArrivedAtBetween(
            @Param("debut") LocalDateTime debut, @Param("fin") LocalDateTime fin);
}
