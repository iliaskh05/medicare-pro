package com.crm.medicare.repository;

import com.crm.medicare.entity.DemoDatasetMarker;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DemoDatasetMarkerRepository extends JpaRepository<DemoDatasetMarker, Long> {

    List<DemoDatasetMarker> findByEntityTypeOrderByIdAsc(String entityType);

    List<DemoDatasetMarker> findAllByOrderByIdAsc();

    void deleteByEntityTypeAndEntityId(String entityType, String entityId);

    boolean existsByEntityType(String entityType);
}
