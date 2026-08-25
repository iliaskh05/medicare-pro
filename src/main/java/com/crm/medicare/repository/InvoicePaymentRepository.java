package com.crm.medicare.repository;

import com.crm.medicare.entity.InvoicePayment;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoicePaymentRepository extends JpaRepository<InvoicePayment, Long> {
    Optional<InvoicePayment> findByIdempotencyKey(String idempotencyKey);
}
