package com.preventia.shared.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.time.Duration;

/**
 * S3 service for prescription PDF and lab result storage.
 *
 * Key naming conventions:
 *   prescriptions/{appointmentId}/{filename}  — prescription PDFs
 *   lab-results/{orderId}/{filename}          — lab result PDFs
 *
 * Pre-signed URLs use a 15-minute expiry by default — sufficient for NRI
 * Sponsors to view in-session, short enough to prevent link-sharing abuse.
 */
@Service
public class S3Service {

    private static final Logger log = LoggerFactory.getLogger(S3Service.class);
    private static final Duration DEFAULT_PRESIGNED_EXPIRY = Duration.ofMinutes(15);

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    public S3Service(S3Client s3Client, S3Presigner s3Presigner) {
        this.s3Client    = s3Client;
        this.s3Presigner = s3Presigner;
    }

    // -------------------------------------------------------------------------
    // Upload
    // -------------------------------------------------------------------------

    /**
     * Uploads a file to S3 and returns the S3 key.
     *
     * @param keyPrefix   path prefix, e.g. "prescriptions/42" or "lab-results/7"
     * @param filename    original file name, e.g. "prescription.pdf"
     * @param content     raw file bytes
     * @param contentType MIME type, e.g. "application/pdf"
     * @return the full S3 key that was written (store this on the entity)
     */
    public String uploadFile(String keyPrefix, String filename, byte[] content, String contentType) {
        String s3Key = keyPrefix + "/" + filename;

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .contentType(contentType)
                .contentLength((long) content.length)
                .build();

        s3Client.putObject(request, RequestBody.fromBytes(content));
        log.info("S3 upload complete: s3://{}/{} ({} bytes)", bucketName, s3Key, content.length);

        return s3Key;
    }

    // -------------------------------------------------------------------------
    // Pre-signed URL
    // -------------------------------------------------------------------------

    /**
     * Generates a pre-signed GET URL with a custom expiry.
     *
     * @param s3Key  the S3 key of the object (as returned by {@link #uploadFile})
     * @param expiry how long the URL should remain valid
     * @return HTTPS pre-signed URL string
     */
    public String generatePresignedUrl(String s3Key, Duration expiry) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(expiry)
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);
        String url = presigned.url().toString();

        log.debug("Generated pre-signed URL for s3://{}/{} (expiry={})", bucketName, s3Key, expiry);
        return url;
    }

    /**
     * Generates a pre-signed GET URL with the default 15-minute expiry.
     *
     * @param s3Key the S3 key of the object
     * @return HTTPS pre-signed URL string valid for 15 minutes
     */
    public String generatePresignedUrl(String s3Key) {
        return generatePresignedUrl(s3Key, DEFAULT_PRESIGNED_EXPIRY);
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    /**
     * Deletes an object from S3. Safe to call on non-existent keys (S3 is idempotent).
     *
     * @param s3Key the S3 key of the object to remove
     */
    public void deleteFile(String s3Key) {
        DeleteObjectRequest request = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build();

        s3Client.deleteObject(request);
        log.info("S3 object deleted: s3://{}/{}", bucketName, s3Key);
    }

    // -------------------------------------------------------------------------
    // Existence check
    // -------------------------------------------------------------------------

    /**
     * Checks whether an object exists in S3 without downloading it.
     *
     * Uses HeadObject — O(1) metadata request, no data transfer.
     *
     * @param s3Key the S3 key to probe
     * @return {@code true} if the object exists; {@code false} if not found
     */
    public boolean fileExists(String s3Key) {
        try {
            HeadObjectRequest request = HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            s3Client.headObject(request);
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (S3Exception e) {
            // Propagate unexpected S3 errors (permissions, network, etc.)
            log.error("S3 headObject error for key '{}': {}", s3Key, e.getMessage());
            throw e;
        }
    }
}
