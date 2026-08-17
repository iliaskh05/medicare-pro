package com.crm.medicare.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public final class Patient360Dtos {

    private Patient360Dtos() {}

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistoryItem {
        private String date;
        private String type;
        private String intitule;
        private String praticien;
        private String note;
        private String tone;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImagingItem {
        private String id;
        private String examen;
        private String modalite;
        private String date;
        private String radiologue;
        private String statut;
        private String tone;
        private String conclusion;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrescriptionItem {
        private String id;
        private String date;
        private String prescripteur;
        private List<String> lignes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BillingItem {
        private String id;
        private String acte;
        private String date;
        private BigDecimal total;
        private BigDecimal mutuelle;
        private String statut;
        private String tone;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FinancialStatus {
        private String examen;
        private BigDecimal total;
        private BigDecimal acompte;
        private String statutImpression;
        private BigDecimal reste;
    }
}
