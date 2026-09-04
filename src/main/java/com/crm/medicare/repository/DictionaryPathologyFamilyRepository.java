package com.crm.medicare.repository;

import com.crm.medicare.entity.DictionaryPathologyFamily;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DictionaryPathologyFamilyRepository extends JpaRepository<DictionaryPathologyFamily, Long> {
    List<DictionaryPathologyFamily> findByActiveTrueOrderByLabelAsc();

    List<DictionaryPathologyFamily> findAllByOrderByLabelAsc();

    Optional<DictionaryPathologyFamily> findByCodeIgnoreCase(String code);
}
