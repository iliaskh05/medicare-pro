package com.crm.medicare.repository;

import com.crm.medicare.entity.ExamStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExamStatusHistoryRepository extends JpaRepository<ExamStatusHistory, Long> {}
