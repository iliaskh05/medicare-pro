package com.crm.medicare.repository;

import com.crm.medicare.entity.Invoice;
import com.crm.medicare.workflow.InvoiceStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByReferenceIgnoreCase(String reference);

    long countByReferenceStartingWith(String prefix);

    @Query(
            """
            SELECT DISTINCT i FROM Invoice i
            JOIN FETCH i.patient
            LEFT JOIN FETCH i.items
            ORDER BY i.createdAt DESC
            """)
    List<Invoice> findAllWithPatient();

    @Query(
            """
            SELECT i FROM Invoice i
            JOIN FETCH i.patient
            LEFT JOIN FETCH i.items
            WHERE i.id = :id
            """)
    Optional<Invoice> findByIdWithDetails(@Param("id") Long id);

    @Query(
            """
            SELECT i FROM Invoice i
            JOIN FETCH i.patient
            LEFT JOIN FETCH i.items
            WHERE i.patient.id = :patientId
            ORDER BY i.createdAt DESC
            """)
    List<Invoice> findByPatientId(@Param("patientId") Long patientId);

    @Query(
            """
            SELECT COALESCE(SUM(i.total - i.amountPaid + i.amountRefunded), 0)
            FROM Invoice i
            WHERE i.patient.id = :patientId
              AND i.statut NOT IN :excluded
            """)
    java.math.BigDecimal balanceForPatient(
            @Param("patientId") Long patientId,
            @Param("excluded") java.util.Collection<InvoiceStatus> excluded);

    @Query(
            """
            SELECT COALESCE(SUM(i.amountPaid), 0)
            FROM Invoice i
            WHERE i.statut IN :statuses
              AND i.issuedAt >= :debut AND i.issuedAt < :fin
            """)
    java.math.BigDecimal sumAmountPaidBetween(
            @Param("debut") java.time.LocalDateTime debut,
            @Param("fin") java.time.LocalDateTime fin,
            @Param("statuses") java.util.Collection<InvoiceStatus> statuses);
}
