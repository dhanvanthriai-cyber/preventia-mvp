package com.dhanvanthri.pharmacy.domain;

/**
 * Indicates how urgently a medication refill is needed based on days remaining.
 *
 * Thresholds:
 *   CRITICAL — ≤ 3 days remaining (patient may run out imminently)
 *   WARNING  — ≤ 7 days remaining (time to arrange refill)
 *   OK       — > 7 days remaining (no action needed)
 */
public enum RefillUrgency {
    OK,
    WARNING,
    CRITICAL
}
