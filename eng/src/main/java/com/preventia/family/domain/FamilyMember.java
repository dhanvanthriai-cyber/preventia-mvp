package com.preventia.family.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

/**
 * A dependent family member profile managed by a RECIPIENT user.
 * Not a full platform account — owned by one RECIPIENT (owner_user_id).
 * Used for care enrollment, wellness programs, and the family hub dashboard.
 *
 * Schema: V15__family_members.sql
 */
@Entity
@Table(name = "family_members")
public class FamilyMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The RECIPIENT user who owns and manages this profile. */
    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "email", length = 320)
    private String email;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(name = "relationship", nullable = false)
    private RelationshipType relationship = RelationshipType.OTHER;

    /** S3 object key for the optional profile photo. */
    @Column(name = "photo_s3_key", length = 1000)
    private String photoS3Key;

    @Enumerated(EnumType.STRING)
    @Column(name = "care_status", nullable = false)
    private CareStatus careStatus = CareStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    // ── Enums ────────────────────────────────────────────────────────────────

    public enum RelationshipType {
        CHILD, PARENT, SPOUSE, OTHER
    }

    public enum CareStatus {
        ACTIVE, CARE_UPDATED, PENDING_LAB, UP_TO_DATE
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public Long getId()                        { return id; }
    public Long getOwnerUserId()               { return ownerUserId; }
    public String getFirstName()               { return firstName; }
    public String getLastName()                { return lastName; }
    public LocalDate getDateOfBirth()          { return dateOfBirth; }
    public String getPhone()                   { return phone; }
    public String getEmail()                   { return email; }
    public String getAddress()                 { return address; }
    public RelationshipType getRelationship()  { return relationship; }
    public String getPhotoS3Key()              { return photoS3Key; }
    public CareStatus getCareStatus()          { return careStatus; }
    public Instant getCreatedAt()              { return createdAt; }
    public Instant getUpdatedAt()              { return updatedAt; }

    // ── Setters ──────────────────────────────────────────────────────────────

    public void setOwnerUserId(Long ownerUserId)               { this.ownerUserId = ownerUserId; }
    public void setFirstName(String firstName)                 { this.firstName = firstName; }
    public void setLastName(String lastName)                   { this.lastName = lastName; }
    public void setDateOfBirth(LocalDate dateOfBirth)          { this.dateOfBirth = dateOfBirth; }
    public void setPhone(String phone)                         { this.phone = phone; }
    public void setEmail(String email)                         { this.email = email; }
    public void setAddress(String address)                     { this.address = address; }
    public void setRelationship(RelationshipType relationship) { this.relationship = relationship; }
    public void setPhotoS3Key(String photoS3Key)               { this.photoS3Key = photoS3Key; }
    public void setCareStatus(CareStatus careStatus)           { this.careStatus = careStatus; }
    public void setUpdatedAt(Instant updatedAt)                { this.updatedAt = updatedAt; }
}
