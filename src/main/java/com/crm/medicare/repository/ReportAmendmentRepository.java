package com.crm.medicare.repository;

import com.crm.medicare.entity.ReportAmendment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportAmendmentRepository extends JpaRepository<ReportAmendment, Long> {

    List<ReportAmendment> findByReportIdOrderByCreatedAtAsc(Long reportId);
}
