package com.crm.medicare.repository;

import com.crm.medicare.entity.UserPreference;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {
    List<UserPreference> findByUserIdOrderByPreferenceKeyAsc(Long userId);

    Optional<UserPreference> findByUserIdAndPreferenceKey(Long userId, String preferenceKey);
}
