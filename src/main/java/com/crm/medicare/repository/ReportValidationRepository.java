package com.crm.medicare.repository;

import com.crm.medicare.entity.ReportValidation;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportValidationRepository extends JpaRepository<ReportValidation, Long> {

    List<ReportValidation> findByReportIdOrderByValidatedAtAsc(Long reportId);
}
