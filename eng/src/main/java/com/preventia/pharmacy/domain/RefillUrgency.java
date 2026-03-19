package com.preventia.pharmacy.domain;

/**
 * Classifies how urgently a medication needs to be refilled.
 * Driven by days remaining: floor(totalQuantity / dailyDosage).
 */
public enum RefillUrgency {
    /** ≤ 3 days remaining — immediate refill required */
    CRITICAL,
    /** 4–7 days remaining — refill soon */
    WARNING,
    /** > 7 days remaining — no action needed */
    OK
}

