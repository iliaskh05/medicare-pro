package com.crm.medicare.repository;

import com.crm.medicare.entity.DataImportJob;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DataImportJobRepository extends JpaRepository<DataImportJob, Long> {

    List<DataImportJob> findTop50ByOrderByCreatedAtDesc();
}
