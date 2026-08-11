package com.crm.medicare.repository;

import com.crm.medicare.entity.MedecinReferent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MedecinReferentRepository extends JpaRepository<MedecinReferent, Long> {
}
