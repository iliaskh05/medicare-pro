package com.crm.medicare.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

class GlobalExceptionHandlerTest {

    @Test
    void apiExceptionIsNormalizedWithoutStackTrace() throws Exception {
        MockMvc mvc =
                MockMvcBuilders.standaloneSetup(new BoomController())
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();

        mvc.perform(get("/boom").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("patient_duplicate_cin"))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.path").value("/boom"))
                .andExpect(jsonPath("$.message").value("Un patient existe déjà avec ce CIN"))
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @RestController
    static class BoomController {
        @GetMapping("/boom")
        String boom() {
            throw ApiException.conflict("patient_duplicate_cin", "Un patient existe déjà avec ce CIN");
        }
    }

    @Test
    void dataIntegrityViolationIsConflictNot500() throws Exception {
        MockMvc mvc =
                MockMvcBuilders.standaloneSetup(new IntegrityBoomController())
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();

        mvc.perform(get("/integrity").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("patient_duplicate_cin"))
                .andExpect(jsonPath("$.status").value(409));
    }

    @RestController
    static class IntegrityBoomController {
        @GetMapping("/integrity")
        String boom() {
            throw new DataIntegrityViolationException(
                    "duplicate", new RuntimeException("uk_patients_cin duplicate key cin"));
        }
    }

    @Test
    void correlationIdFilterExposesHeader() {
        assertThat(CorrelationIdFilter.HEADER).isEqualTo("X-Correlation-Id");
    }
}
