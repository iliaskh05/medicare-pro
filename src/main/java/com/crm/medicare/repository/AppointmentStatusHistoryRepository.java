package com.crm.medicare.repository;

import com.crm.medicare.entity.AppointmentStatusHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentStatusHistoryRepository extends JpaRepository<AppointmentStatusHistory, Long> {

    List<AppointmentStatusHistory> findByAppointmentIdOrderByCreatedAtAsc(Long appointmentId);
}
