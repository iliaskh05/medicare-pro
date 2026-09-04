package com.crm.medicare.repository;

import com.crm.medicare.entity.DictionaryPathology;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DictionaryPathologyRepository extends JpaRepository<DictionaryPathology, Long> {
    Optional<DictionaryPathology> findByCodeIgnoreCase(String code);

    @Query(
            """
            SELECT p FROM DictionaryPathology p
            LEFT JOIN FETCH p.family
            WHERE (:familyId IS NULL OR p.family.id = :familyId)
              AND (:q IS NULL OR LOWER(p.label) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                   OR LOWER(p.code) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
            ORDER BY p.label ASC
            """)
    List<DictionaryPathology> search(@Param("familyId") Long familyId, @Param("q") String q);
}
