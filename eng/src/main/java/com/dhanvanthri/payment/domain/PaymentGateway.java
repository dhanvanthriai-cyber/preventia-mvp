package com.dhanvanthri.payment.domain;

/**
 * Supported payment gateways.
 * STRIPE  — USD payments from NRI sponsors
 * RAZORPAY — INR payments from India-based recipients/sponsors
 */
public enum PaymentGateway {
    STRIPE,
    RAZORPAY
}
