package com.crm.medicare.repository;

import com.crm.medicare.entity.Appointment;
import com.crm.medicare.entity.AppointmentStatus;
import com.crm.medicare.entity.Modalite;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    @Query(
            """
            SELECT a FROM Appointment a
            JOIN FETCH a.patient
            LEFT JOIN FETCH a.catalogue
            LEFT JOIN FETCH a.resource
            LEFT JOIN FETCH a.prescripteur
            WHERE a.id = :id
            """)
    Optional<Appointment> findByIdWithDetails(@Param("id") Long id);

    @Query(
            """
            SELECT DISTINCT a FROM Appointment a
            JOIN FETCH a.patient
            LEFT JOIN FETCH a.catalogue
            LEFT JOIN FETCH a.resource
            LEFT JOIN FETCH a.prescripteur
            WHERE a.startsAt >= :from AND a.startsAt < :to
              AND (:statut IS NULL OR a.statut = :statut)
              AND (:resourceId IS NULL OR a.resource.id = :resourceId)
              AND (:prescripteurId IS NULL OR a.prescripteur.id = :prescripteurId)
              AND (:modalite IS NULL OR a.modalite = :modalite)
            ORDER BY a.startsAt ASC
            """)
    List<Appointment> findInRange(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("statut") AppointmentStatus statut,
            @Param("resourceId") Long resourceId,
            @Param("prescripteurId") Long prescripteurId,
            @Param("modalite") Modalite modalite);

    @Query(
            """
            SELECT a FROM Appointment a
            WHERE a.resource.id = :resourceId
              AND a.statut NOT IN :excluded
              AND a.startsAt < :endsAt
              AND a.endsAt > :startsAt
              AND (:excludeId IS NULL OR a.id <> :excludeId)
            """)
    List<Appointment> findOverlaps(
            @Param("resourceId") Long resourceId,
            @Param("startsAt") LocalDateTime startsAt,
            @Param("endsAt") LocalDateTime endsAt,
            @Param("excludeId") Long excludeId,
            @Param("excluded") Collection<AppointmentStatus> excluded);

    Page<Appointment> findByPatientIdOrderByStartsAtDesc(Long patientId, Pageable pageable);

    @Query(
            """
            SELECT COUNT(a) FROM Appointment a
            WHERE a.startsAt >= :from AND a.startsAt < :to
              AND a.statut NOT IN :excluded
            """)
    long countInRangeExcluding(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("excluded") Collection<AppointmentStatus> excluded);

    @Query(
            """
            SELECT COALESCE(SUM(a.dureeMinutes), 0) FROM Appointment a
            WHERE a.startsAt >= :from AND a.startsAt < :to
              AND a.statut NOT IN :excluded
              AND a.resource IS NOT NULL
            """)
    long sumBookedMinutesInRange(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("excluded") Collection<AppointmentStatus> excluded);
}
