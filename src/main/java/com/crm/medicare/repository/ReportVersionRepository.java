package com.crm.medicare.repository;

import com.crm.medicare.entity.ReportVersion;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportVersionRepository extends JpaRepository<ReportVersion, Long> {

    List<ReportVersion> findByReportIdOrderByVersionNumberAsc(Long reportId);

    Optional<ReportVersion> findByReportIdAndVersionNumber(Long reportId, Integer versionNumber);
}
