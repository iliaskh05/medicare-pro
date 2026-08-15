package com.crm.medicare.repository;

import com.crm.medicare.entity.Examen;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ExamenRepository extends JpaRepository<Examen, Long> {

    @Query(
            """
            SELECT e FROM Examen e
            JOIN FETCH e.patient
            LEFT JOIN FETCH e.prescripteur
            WHERE e.dateExamen >= :debut AND e.dateExamen < :fin
            ORDER BY e.dateExamen ASC
            """)
    List<Examen> findByDateExamenBetween(
            @Param("debut") LocalDateTime debut, @Param("fin") LocalDateTime fin);

    long countByNumSejourStartingWith(String prefix);
}
