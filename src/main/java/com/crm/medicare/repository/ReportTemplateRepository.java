package com.crm.medicare.repository;

import com.crm.medicare.entity.ReportTemplate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportTemplateRepository extends JpaRepository<ReportTemplate, Long> {

    List<ReportTemplate> findByActiveTrueOrderByLabelAsc();

    List<ReportTemplate> findByActiveTrueAndModaliteIgnoreCaseOrderByLabelAsc(String modalite);

    Optional<ReportTemplate> findByCodeIgnoreCase(String code);
}
