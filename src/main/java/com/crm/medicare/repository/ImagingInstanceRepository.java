package com.crm.medicare.repository;

import com.crm.medicare.entity.ImagingInstance;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImagingInstanceRepository extends JpaRepository<ImagingInstance, Long> {

    List<ImagingInstance> findBySeriesIdOrderByInstanceNumberAscIdAsc(Long seriesId);
}
