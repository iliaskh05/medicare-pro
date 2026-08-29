package com.crm.medicare.repository;

import com.crm.medicare.entity.AnomalyOperation;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnomalyOperationRepository extends JpaRepository<AnomalyOperation, Long> {

    Optional<AnomalyOperation> findByOperationId(String operationId);

    Optional<AnomalyOperation> findByInvoiceId(Long invoiceId);

    List<AnomalyOperation> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    List<AnomalyOperation> findByDecisionOrderByAnomalyScoreDesc(String decision);

    @Query(
            """
            SELECT a FROM AnomalyOperation a
            WHERE a.createdAt >= :since
            ORDER BY a.anomalyScore DESC, a.createdAt DESC
            """)
    List<AnomalyOperation> findRecentSince(@Param("since") LocalDateTime since);

    @Query(
            """
            SELECT a FROM AnomalyOperation a
            WHERE a.anomalyScore >= :minScore
              AND a.createdAt >= :since
            ORDER BY a.anomalyScore DESC, a.createdAt DESC
            """)
    List<AnomalyOperation> findAlertsSince(
            @Param("since") LocalDateTime since, @Param("minScore") int minScore);

    long countByCreatedAtGreaterThanEqual(LocalDateTime since);

    long countByDecisionAndCreatedAtGreaterThanEqual(String decision, LocalDateTime since);

    @Query(
            """
            SELECT COALESCE(AVG(a.anomalyScore), 0) FROM AnomalyOperation a
            WHERE a.createdAt >= :since
            """)
    double averageScoreSince(@Param("since") LocalDateTime since);

    List<AnomalyOperation> findByOperationIdStartingWith(String prefix);

    void deleteByOperationIdStartingWith(String prefix);
}
