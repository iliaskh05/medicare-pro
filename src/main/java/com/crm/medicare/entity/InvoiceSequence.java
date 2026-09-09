package com.crm.medicare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "invoice_sequences")
@IdClass(InvoiceSequence.Key.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceSequence {

    @Id
    @Column(nullable = false, length = 32)
    private String series;

    @Id
    @Column(name = "seq_year", nullable = false)
    private Integer year;

    @Column(name = "last_value", nullable = false)
    private long lastValue;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Key implements Serializable {
        private String series;
        @jakarta.persistence.Column(name = "seq_year")
        private Integer year;
    }
}
