package com.dhanvanthri.family.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Core user entity. Role drives all RBAC decisions via Spring Security.
 * Roles: RECIPIENT (Indian parent/patient), SPONSOR (NRI child proxy),
 *        DOCTOR (licensed provider), PHARMACIST (dispensing entity).
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    /** BCrypt-hashed password. Never expose in API responses. */
    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    /**
     * NRI Proxy Identity link.
     * Set only for users with Role=SPONSOR (NRI children funding care from abroad).
     * Links the SPONSOR to their proxy identity record in the system, enabling
     * the Tri-Party consent flow: NRI Sponsor → Proxy → Indian Recipient.
     * Nullable — not applicable for RECIPIENT, DOCTOR, or PHARMACIST roles.
     */
    @Column(name = "nri_proxy_id")
    private UUID nriProxyId;

    /**
     * Ayushman Bharat Health Account (ABHA) ID.
     * Stores the 14-digit ABHA number issued by the National Health Authority.
     * Required for ABDM FHIR R4 patient linking and Health Information Exchange (HIE).
     * Nullable — patients may not yet have an ABHA ID at registration time.
     * Max length 50 to accommodate future ABHA address format (name@abdm).
     */
    @Column(name = "abha_id", length = 50)
    private String abhaId;

    public enum Role {
        /** Indian parent/elder receiving care — formerly PATIENT */
        RECIPIENT,
        /** NRI child acting as remote proxy sponsor */
        SPONSOR,
        /** Licensed physician on the platform */
        DOCTOR,
        /** Dispensing pharmacy entity — formerly PHARMACY */
        PHARMACIST
    }

    // --- Getters / Setters (Lombok can replace these in next pass) ---

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public Instant getCreatedAt() { return createdAt; }

    public UUID getNriProxyId() { return nriProxyId; }
    public void setNriProxyId(UUID nriProxyId) { this.nriProxyId = nriProxyId; }

    public String getAbhaId() { return abhaId; }
    public void setAbhaId(String abhaId) { this.abhaId = abhaId; }
}
