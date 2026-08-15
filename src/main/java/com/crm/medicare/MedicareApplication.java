package com.crm.medicare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class MedicareApplication {

    public static void main(String[] args) {
        SpringApplication.run(MedicareApplication.class, args);
    }
}
