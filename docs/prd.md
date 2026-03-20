Project Preventia MVP
1. Executive Summary
   Preventia is a high-trust healthcare platform bridging the gap between Non-Resident Indian (NRI) children (Sponsors) and their parents in India (Recipients). The MVP focuses on a "Tri-Party Validation" model involving Patients, Doctors, and Pharmacies to manage chronic care through a high-utility interface.
2. Design & UX Strategy (The Brutalist Mandate)
      The UI must strictly adhere to Brutalist principles for maximum scannability by elderly users.

Aesthetic: High-contrast monochromatic palette (#000000, #FFFFFF).
Structural: Rigid 4px solid black borders, 0px border-radius, and hard 4px offset shadows.
Typography: Monospace fonts (JetBrains Mono / Roboto Mono) for all clinical and inventory data.
Action Cards: Critical service triggers (e.g., "Join Call," "Refill Required") must stick to the top of the mobile feed as high-contrast blocks.

3. Core User Personas (MVP Scope)
   Patient (Recipient): Primary user in India. Focus on joining video calls and viewing medication orders.

NRI Child (Sponsor/Proxy): Views parents' records, pays for consultations/meds, and receives real-time status updates.

Doctor: Conducts virtual sessions, takes structured SOAP notes, and uploads prescription PDFs.

Pharmacy: Manages medication catalogs, provides quotes, and fulfills orders.

4. Functional Requirements & MVP ShortcutsVideo & Chat: Integrated 1:1 video (Daily.co) and text chat (Stream Chat) between Patient↔Doctor and Patient↔Pharmacy.Prescription Flow (The "PDF Shortcut"): To save 3 months of dev time, doctors will upload Prescription PDFs to S3. Pharmacies will verify these manually instead of using e-prescribing vendors (DoseSpot).Medication Inventory: A "Next Action" engine calculates days remaining based on dosage: $Days\_Remaining = \frac{Total\_Quantity} {Daily\_Dosage}$.Payments: Integration via Razorpay (supporting UPI/INR) for consultation fees and pharmacy orders.
5. Technical Specifications
   Backend: Java 21 + Spring Boot 3.2 (Modular Monolith).

Mobile: React Native (Expo) for role-based views.

Web: Next.js 14 for Doctor and Pharmacy dashboards.

Compliance: Adherence to ABDM (FHIR R4) standards for clinical note structures to ensure future interoperability with India's national health stack.

6. Operational Safety Rails

Stale Task Lock: Tasks not completed within 12 hours of their window (e.g., a missed phlebotomy slot) are flagged for intervention.

Data Residency: All PHI (Personal Health Information) must be stored in the AWS Mumbai (ap-south-1) region to comply with Indian data laws.