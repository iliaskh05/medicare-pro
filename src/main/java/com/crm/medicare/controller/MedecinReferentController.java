package com.crm.medicare.controller;

import com.crm.medicare.entity.MedecinReferent;
import com.crm.medicare.repository.MedecinReferentRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/medecins")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class MedecinReferentController {

    private final MedecinReferentRepository medecinReferentRepository;

    @GetMapping
    public List<MedecinReferent> getAllMedecins() {
        return medecinReferentRepository.findAll();
    }
}
