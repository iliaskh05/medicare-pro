package com.crm.medicare.repository;

import com.crm.medicare.entity.EtatPatient;
import com.crm.medicare.entity.Examen;
import java.time.LocalDateTime;
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
            SELECT DISTINCT e FROM Examen e
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
}
