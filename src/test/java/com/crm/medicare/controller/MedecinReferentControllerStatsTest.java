package com.crm.medicare.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.crm.medicare.entity.MedecinReferent;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.MedecinReferentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MedecinReferentControllerStatsTest {

    @Autowired private MedecinReferentRepository medecinReferentRepository;
    @Autowired private ExamenRepository examenRepository;

    @Test
    void statsZeroWhenNoExams() {
        MedecinReferent m = new MedecinReferent();
        m.setNom("Dr Stats Zero");
        m.setActif(true);
        m = medecinReferentRepository.save(m);

        assertThat(examenRepository.countByPrescripteurId(m.getId())).isZero();
        assertThat(examenRepository.findLastExamenAtByPrescripteurId(m.getId())).isNull();
    }
}
