package com.preventia.care.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "care_plan_responses")
public class CarePlanResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "care_plan_id", nullable = false)
    private Long carePlanId;

    @Column(name = "response_text", columnDefinition = "TEXT")
    private String responseText;

    @Column(name = "stream_message_id", length = 255)
    private String streamMessageId;

    @Column(name = "responded_at", nullable = false, updatable = false)
    private Instant respondedAt;

    protected CarePlanResponse() {}

    public CarePlanResponse(Long carePlanId, String responseText, String streamMessageId) {
        this.carePlanId       = carePlanId;
        this.responseText     = responseText;
        this.streamMessageId  = streamMessageId;
        this.respondedAt      = Instant.now();
    }

    public Long    getId()             { return id; }
    public Long    getCarePlanId()     { return carePlanId; }
    public String  getResponseText()   { return responseText; }
    public String  getStreamMessageId(){ return streamMessageId; }
    public Instant getRespondedAt()    { return respondedAt; }
}
