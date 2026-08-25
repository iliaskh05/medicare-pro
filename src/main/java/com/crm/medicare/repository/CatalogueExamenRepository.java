package com.crm.medicare.repository;

import com.crm.medicare.entity.CatalogueExamen;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CatalogueExamenRepository extends JpaRepository<CatalogueExamen, Long> {

    List<CatalogueExamen> findAllByOrderByNomAsc();

    List<CatalogueExamen> findByActifTrueOrderByNomAsc();

    Optional<CatalogueExamen> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);
}
