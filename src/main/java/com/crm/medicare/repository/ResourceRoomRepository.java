package com.crm.medicare.repository;

import com.crm.medicare.entity.ResourceRoom;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResourceRoomRepository extends JpaRepository<ResourceRoom, Long> {

    List<ResourceRoom> findByActifTrueOrderByLibelleAsc();

    Optional<ResourceRoom> findByCodeIgnoreCase(String code);
}
