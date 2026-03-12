package com.dhanvanthri;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling   // activates PrescriptionSlaScheduler (cron every 30 min)
public class DhanvanthriApplication {
    public static void main(String[] args) {
        SpringApplication.run(DhanvanthriApplication.class, args);
    }
}
