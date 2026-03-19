package com.preventia.shared.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.EnvironmentVariableCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * AWS S3 configuration.
 *
 * Credentials are resolved automatically from environment variables:
 *   AWS_ACCESS_KEY_ID      — IAM access key
 *   AWS_SECRET_ACCESS_KEY  — IAM secret key
 *
 * Region defaults to ap-south-1 (AWS Mumbai) for DPDP data residency compliance.
 */
@Configuration
public class S3Config {

    @Value("${aws.region:ap-south-1}")
    private String region;

    /**
     * Synchronous S3 client used for upload, delete, and head-object operations.
     */
    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(EnvironmentVariableCredentialsProvider.create())
                .build();
    }

    /**
     * S3 pre-signer for generating time-limited GET URLs.
     * Used to share prescription PDFs securely with NRI Sponsors and Pharmacists.
     */
    @Bean
    public S3Presigner s3Presigner() {
        return S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(EnvironmentVariableCredentialsProvider.create())
                .build();
    }
}
