package com.crm.medicare.repository;

import com.crm.medicare.entity.ImagingSeries;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImagingSeriesRepository extends JpaRepository<ImagingSeries, Long> {

    List<ImagingSeries> findByStudyIdOrderBySeriesNumberAscIdAsc(Long studyId);
}
