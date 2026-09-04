package com.crm.medicare.repository;

import com.crm.medicare.entity.DictionaryAnatomicalZone;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DictionaryAnatomicalZoneRepository extends JpaRepository<DictionaryAnatomicalZone, Long> {
    List<DictionaryAnatomicalZone> findByActiveTrueOrderByLabelAsc();

    List<DictionaryAnatomicalZone> findAllByOrderByLabelAsc();

    Optional<DictionaryAnatomicalZone> findByCodeIgnoreCase(String code);
}
