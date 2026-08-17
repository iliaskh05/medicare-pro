package com.crm.medicare.repository;

import com.crm.medicare.entity.Patient;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long>, JpaSpecificationExecutor<Patient> {

    Optional<Patient> findByCin(String cin);

    Optional<Patient> findByCinIgnoreCaseAndDeletedAtIsNull(String cin);

    boolean existsByCin(String cin);

    boolean existsByCinIgnoreCaseAndDeletedAtIsNullAndIdNot(String cin, Long id);

    Optional<Patient> findByIdAndDeletedAtIsNull(Long id);

    Optional<Patient> findByNumeroDossierAndDeletedAtIsNull(String numeroDossier);

    List<Patient> findByDeletedAtIsNullOrderByNomCompletAsc();

    @Query(
            """
            SELECT p FROM Patient p
            WHERE p.deletedAt IS NULL
              AND (
                :phone IS NOT NULL AND p.telephone = :phone
                OR (
                  LOWER(p.nom) = LOWER(:nom)
                  AND LOWER(p.prenom) = LOWER(:prenom)
                  AND p.dateNaissance = :dob
                )
              )
              AND (:excludeId IS NULL OR p.id <> :excludeId)
            """)
    List<Patient> findPotentialDuplicates(
            @Param("phone") String phone,
            @Param("nom") String nom,
            @Param("prenom") String prenom,
            @Param("dob") LocalDate dob,
            @Param("excludeId") Long excludeId);
}
