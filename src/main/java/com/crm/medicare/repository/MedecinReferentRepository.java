package com.crm.medicare.repository;

import com.crm.medicare.entity.MedecinReferent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MedecinReferentRepository extends JpaRepository<MedecinReferent, Long> {

    List<MedecinReferent> findByActifTrueOrderByNomAsc();
}
