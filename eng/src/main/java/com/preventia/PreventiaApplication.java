package com.preventia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling   // activates PrescriptionSlaScheduler (cron every 30 min)
public class PreventiaApplication {
    public static void main(String[] args) {
        SpringApplication.run(PreventiaApplication.class, args);
    }
}
