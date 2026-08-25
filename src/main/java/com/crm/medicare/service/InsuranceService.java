package com.crm.medicare.service;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.dto.CoverageQuoteDto;
import com.crm.medicare.dto.InsurancePlanWriteRequest;
import com.crm.medicare.dto.InsuranceProviderWriteRequest;
import com.crm.medicare.entity.CoverageRule;
import com.crm.medicare.entity.InsurancePlan;
import com.crm.medicare.entity.InsuranceProvider;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.repository.CoverageRuleRepository;
import com.crm.medicare.repository.InsurancePlanRepository;
import com.crm.medicare.repository.InsuranceProviderRepository;
import com.crm.medicare.repository.PatientRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class InsuranceService {

    private final InsuranceProviderRepository providerRepository;
    private final InsurancePlanRepository planRepository;
    private final CoverageRuleRepository coverageRuleRepository;
    private final PatientRepository patientRepository;

    @Transactional(readOnly = true)
    public List<InsuranceProvider> listProviders(boolean actifsOnly) {
        if (actifsOnly) {
            return providerRepository.findByActifTrueOrderByNomAsc();
        }
        return providerRepository.findAll();
    }

    @Transactional
    public InsuranceProvider createProvider(InsuranceProviderWriteRequest request) {
        if (request == null || isBlank(request.getCode()) || isBlank(request.getNom())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "code et nom obligatoires");
        }
        String code = request.getCode().trim();
        if (providerRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw ApiException.conflict("insurance_provider_duplicate", "Code assureur déjà utilisé");
        }
        InsuranceProvider provider = new InsuranceProvider();
        provider.setCode(code);
        provider.setNom(request.getNom().trim());
        provider.setActif(request.getActif() == null || request.getActif());
        return providerRepository.save(provider);
    }

    @Transactional
    public InsuranceProvider patchProvider(Long id, InsuranceProviderWriteRequest request) {
        InsuranceProvider provider =
                providerRepository
                        .findById(id)
                        .orElseThrow(() -> ApiException.notFound("Assureur introuvable"));
        if (request == null) {
            return provider;
        }
        if (!isBlank(request.getNom())) {
            provider.setNom(request.getNom().trim());
        }
        if (!isBlank(request.getCode())) {
            String code = request.getCode().trim();
            providerRepository
                    .findByCodeIgnoreCase(code)
                    .filter(p -> !p.getId().equals(id))
                    .ifPresent(
                            p -> {
                                throw ApiException.conflict(
                                        "insurance_provider_duplicate", "Code assureur déjà utilisé");
                            });
            provider.setCode(code);
        }
        if (request.getActif() != null) {
            provider.setActif(request.getActif());
        }
        return providerRepository.save(provider);
    }

    @Transactional(readOnly = true)
    public List<InsurancePlan> listPlans(Long providerId, boolean actifsOnly) {
        List<InsurancePlan> plans =
                providerId != null
                        ? planRepository.findByProviderIdOrderByLibelleAsc(providerId)
                        : planRepository.findAll();
        if (actifsOnly) {
            return plans.stream().filter(InsurancePlan::isActif).toList();
        }
        return plans;
    }

    @Transactional
    public InsurancePlan createPlan(InsurancePlanWriteRequest request) {
        if (request == null || request.getProviderId() == null || isBlank(request.getCode()) || isBlank(request.getLibelle())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "providerId, code et libelle obligatoires");
        }
        InsuranceProvider provider =
                providerRepository
                        .findById(request.getProviderId())
                        .orElseThrow(() -> ApiException.notFound("Assureur introuvable"));
        InsurancePlan plan = new InsurancePlan();
        plan.setProvider(provider);
        plan.setCode(request.getCode().trim());
        plan.setLibelle(request.getLibelle().trim());
        plan.setActif(request.getActif() == null || request.getActif());
        InsurancePlan saved = planRepository.save(plan);

        if (request.getTauxPercent() != null) {
            CoverageRule rule = new CoverageRule();
            rule.setPlan(saved);
            rule.setTauxPercent(request.getTauxPercent());
            rule.setPlafond(request.getPlafond());
            rule.setCatalogueId(request.getCatalogueId());
            rule.setModalite(blankToNull(request.getModalite()));
            coverageRuleRepository.save(rule);
        }
        return saved;
    }

    @Transactional
    public InsurancePlan patchPlan(Long id, InsurancePlanWriteRequest request) {
        InsurancePlan plan =
                planRepository
                        .findByIdWithProvider(id)
                        .orElseThrow(() -> ApiException.notFound("Plan introuvable"));
        if (request == null) {
            return plan;
        }
        if (request.getProviderId() != null) {
            InsuranceProvider provider =
                    providerRepository
                            .findById(request.getProviderId())
                            .orElseThrow(() -> ApiException.notFound("Assureur introuvable"));
            plan.setProvider(provider);
        }
        if (!isBlank(request.getCode())) {
            plan.setCode(request.getCode().trim());
        }
        if (!isBlank(request.getLibelle())) {
            plan.setLibelle(request.getLibelle().trim());
        }
        if (request.getActif() != null) {
            plan.setActif(request.getActif());
        }
        InsurancePlan saved = planRepository.save(plan);

        if (request.getTauxPercent() != null) {
            List<CoverageRule> rules = coverageRuleRepository.findByPlanId(saved.getId());
            CoverageRule rule =
                    rules.stream()
                            .filter(r -> r.getCatalogueId() == null && r.getModalite() == null)
                            .findFirst()
                            .orElseGet(
                                    () -> {
                                        CoverageRule r = new CoverageRule();
                                        r.setPlan(saved);
                                        return r;
                                    });
            rule.setTauxPercent(request.getTauxPercent());
            if (request.getPlafond() != null) {
                rule.setPlafond(request.getPlafond());
            }
            coverageRuleRepository.save(rule);
        }
        return saved;
    }

    /**
     * Quote couverture pour un patient / acte catalogue. Sans plan → taux 0 (patient 100 %).
     * Les taux viennent uniquement des {@link CoverageRule} en base.
     */
    @Transactional(readOnly = true)
    public CoverageQuoteDto coverage(Long patientId, Long catalogueId) {
        if (patientId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "patientId obligatoire");
        }
        Patient patient =
                patientRepository
                        .findByIdAndDeletedAtIsNull(patientId)
                        .orElseThrow(() -> ApiException.notFound("Patient introuvable"));
        Optional<CoverageRule> rule = resolveRule(patient, catalogueId);
        if (rule.isEmpty()) {
            return CoverageQuoteDto.builder()
                    .tauxPercent(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .plafond(null)
                    .patientShareHint(null)
                    .build();
        }
        CoverageRule r = rule.get();
        BigDecimal taux = nz(r.getTauxPercent()).setScale(2, RoundingMode.HALF_UP);
        return CoverageQuoteDto.builder()
                .tauxPercent(taux)
                .plafond(r.getPlafond())
                .patientShareHint(null)
                .build();
    }

    /**
     * Part assurance pour un montant total. Sans plan / règle → 0.
     * Applique taux DB puis plafond si présent.
     */
    @Transactional(readOnly = true)
    public BigDecimal computeShare(Long patientId, BigDecimal total, Long catalogueId) {
        BigDecimal amount = nz(total).setScale(2, RoundingMode.HALF_UP);
        if (patientId == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        Patient patient = patientRepository.findByIdAndDeletedAtIsNull(patientId).orElse(null);
        if (patient == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        Optional<CoverageRule> rule = resolveRule(patient, catalogueId);
        if (rule.isEmpty()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        CoverageRule r = rule.get();
        BigDecimal taux = nz(r.getTauxPercent());
        BigDecimal share =
                amount
                        .multiply(taux)
                        .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        if (r.getPlafond() != null && share.compareTo(r.getPlafond()) > 0) {
            share = r.getPlafond().setScale(2, RoundingMode.HALF_UP);
        }
        return share.min(amount).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    private Optional<CoverageRule> resolveRule(Patient patient, Long catalogueId) {
        if (patient.getInsurancePlan() == null || patient.getInsurancePlan().getId() == null) {
            return Optional.empty();
        }
        Long planId = patient.getInsurancePlan().getId();
        List<CoverageRule> rules = coverageRuleRepository.findByPlanId(planId);
        if (rules.isEmpty()) {
            return Optional.empty();
        }
        if (catalogueId != null) {
            Optional<CoverageRule> specific =
                    rules.stream()
                            .filter(r -> catalogueId.equals(r.getCatalogueId()))
                            .findFirst();
            if (specific.isPresent()) {
                return specific;
            }
        }
        return rules.stream()
                .filter(r -> r.getCatalogueId() == null)
                .max(Comparator.comparing(r -> nz(r.getTauxPercent())));
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String blankToNull(String s) {
        return isBlank(s) ? null : s.trim();
    }
}
