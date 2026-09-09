package com.crm.medicare.repository;

import com.crm.medicare.entity.InvoiceSequence;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InvoiceSequenceRepository extends JpaRepository<InvoiceSequence, InvoiceSequence.Key> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM InvoiceSequence s WHERE s.series = :series AND s.year = :year")
    Optional<InvoiceSequence> lockBySeriesAndYear(
            @Param("series") String series, @Param("year") Integer year);
}
