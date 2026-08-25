package com.crm.medicare.repository;

import com.crm.medicare.entity.CoverageRule;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CoverageRuleRepository extends JpaRepository<CoverageRule, Long> {

    List<CoverageRule> findByPlanId(Long planId);
}
