package com.crm.medicare.repository;

import com.crm.medicare.entity.AppSetting;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppSettingRepository extends JpaRepository<AppSetting, String> {
    List<AppSetting> findByKeyStartingWithOrderByKeyAsc(String prefix);
}
