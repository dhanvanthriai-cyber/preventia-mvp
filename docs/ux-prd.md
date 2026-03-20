# UX-PRD: Unified Persona Architecture (Preventia MVP)

## 1. Core Philosophy
The platform must support three distinct personas (Patient, Doctor, Pharmacist) across two technical platforms (Web and Mobile). Access is gated by Persona ID, not by device.

## 2. Platform Specialization
- **Web (Next.js):** Optimized for high-density data. Default view for Doctors (Consultations) and Pharmacists (Inventory).
- **Mobile (React Native):** Optimized for "On-the-go" utility. Default view for NRI Sponsors (Monitoring/Payments) and Patients (Joining calls).

## 3. Persona-Based Navigation (Cross-Platform)

### A. Patient / NRI Sponsor Persona
- **Goal:** Health monitoring, booking, and payment.
- **Key Screens:** - Family Health Dashboard (Timeline of parent's health).
  - Appointment Booking (Slot selection + Payment).
  - Video Consult (The "Virtual Room").
  - Prescription Vault (PDF access).

### B. Doctor Persona
- **Goal:** Patient consultation and clinical documentation.
- **Key Screens:**
  - Appointment Queue (Today’s schedule).
  - Clinical Consult Room (Video + Sidebar for SOAP notes).
  - Digital Prescription Pad (Drug database search).

### C. Pharmacist Persona
- **Goal:** Fulfillment and inventory management.
- **Key Screens:**
  - Order Pipeline (New vs. Dispatched).
  - Inventory Manager (Stock alerts).
  - Prescription Verification (Scanner/Manual check).

## 4. Visual Identity (Brutalist Neo-Classical)
- **Colors:** High-contrast Black/White/Safety-Orange.
- **Typography:** Bold Sans-Serif (Inter/Roboto) for data; Serif (Playfair Display) for headers.
- **Borders:** Heavy 2px-3px solid black lines. No soft shadows.
