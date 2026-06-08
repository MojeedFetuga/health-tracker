// ─────────────────────────────────────────────────────────────────────────────
// MetricHealth — Legal Policy Documents
// Last updated: June 2026
// Developer: Mojeed Fetuga  |  Contact: mojeedfetuga62@gmail.com
// ─────────────────────────────────────────────────────────────────────────────

export const POLICY_DATE = "June 2026";
export const CONTACT_EMAIL = "mojeedfetuga62@gmail.com";
export const APP_URL = "https://metrichealth.vercel.app";

// ─────────────────────────────────────────────────────────────────────────────
export const MEDICAL_DISCLAIMER = {
  title: "Medical Disclaimer",
  sections: [
    {
      heading: "Not a Medical Device",
      body: `MetricHealth is a personal health-tracking tool designed to help individuals log and monitor their own health readings. It is NOT a medical device, NOT a diagnostic tool, and does NOT provide medical advice.`,
    },
    {
      heading: "Not a Substitute for Professional Medical Care",
      body: `The information recorded and displayed in MetricHealth — including health readings, range indicators (Normal, Elevated, High, Low), and any alerts — is for personal reference only. It does not constitute a medical diagnosis, clinical assessment, or professional health recommendation.

Always consult a qualified and licensed medical professional before making any health-related decisions. Never delay seeking professional medical advice based on anything you read or see in this application.`,
    },
    {
      heading: "Range Indicators Are General Guidelines Only",
      body: `The colour-coded range alerts displayed in MetricHealth (e.g. "High", "Elevated", "Normal") are based on widely published general reference ranges for adults. These ranges:

• Do not account for your individual medical history, age, medications, or conditions
• May not apply to children, pregnant women, or people with specific diagnoses
• Are not a substitute for clinical interpretation by a doctor or nurse
• Should not be used to self-diagnose or self-medicate

If any reading triggers a "Crisis" or "High" alert, seek immediate professional medical attention.`,
    },
    {
      heading: "Emergency Situations",
      body: `MetricHealth is not designed for emergency use. If you or someone else is experiencing a medical emergency, call the emergency services in your country immediately (Nigeria: 199 or 112). Do not rely on this application in an emergency.`,
    },
    {
      heading: "No Liability for Health Outcomes",
      body: `The developer of MetricHealth (Mojeed Fetuga) accepts no liability whatsoever for any health outcome, injury, illness, loss, or damage arising from the use of this application or from reliance on any information displayed within it. Your use of this application is entirely at your own risk.`,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
export const PRIVACY_POLICY = {
  title: "Privacy Policy",
  sections: [
    {
      heading: "Overview",
      body: `MetricHealth is built on a local-first, privacy-respecting architecture. Your health data is stored on your own device by default and is never shared with third parties, advertisers, or anyone else.

This policy explains what data we collect, how it is stored, and your rights under the Nigeria Data Protection Regulation (NDPR) 2019.`,
    },
    {
      heading: "Data We Collect",
      body: `MetricHealth collects only what you explicitly enter:

• Health readings you log (blood pressure, temperature, blood sugar, etc.)
• Names and ages of persons you track
• App settings (dark mode, reminders, PIN preference)

We do not collect: location data, device identifiers, contacts, camera or microphone access, browsing history, or any data beyond what you type into the app.`,
    },
    {
      heading: "Where Your Data Is Stored",
      body: `FREE users: All data is stored exclusively on your device using your browser's local storage. Nothing leaves your device. The developer has no access to your data.

PRO users (Cloud Backup enabled): When you choose to enable cloud backup, your data is encrypted on your device using AES-256-GCM encryption before it is transmitted. The encrypted data is then stored in Google Firebase (a service by Google LLC).

IMPORTANT: Your data is encrypted with a key derived from your account credentials before it ever leaves your device. This means the developer cannot read your health records, even as the owner of the Firebase project. Only your device, using your account, can decrypt the data.

Authentication only: We use Google Sign-In (Firebase Authentication) to identify your account. We receive your name, email address, and profile photo from Google solely for authentication purposes.`,
    },
    {
      heading: "Encryption",
      body: `Pro backup data is encrypted using AES-256-GCM, a military-grade encryption standard. Encryption happens entirely in your browser before data is transmitted. The Firebase database stores only ciphertext — an unreadable series of bytes that has no meaning without your encryption key. This protects your data against:

• Unauthorised access to the Firebase database
• Data breaches at the infrastructure level
• Access by the developer or any third party`,
    },
    {
      heading: "Third-Party Services",
      body: `MetricHealth uses the following third-party services:

• Google Firebase (Authentication + Firestore database) — used for sign-in and encrypted cloud backup. Firebase is operated by Google LLC and is subject to Google's Privacy Policy.
• Paystack — used to process Pro subscription payments. Paystack receives your email address and payment information. MetricHealth does not store your card details. Paystack is subject to its own Privacy Policy.
• Vercel — used to host and serve the application. Vercel may log standard HTTP request metadata (IP address, user agent) for security purposes.

We do not use advertising networks, analytics trackers, or any other third-party data services.`,
    },
    {
      heading: "Your Rights Under NDPR",
      body: `Under the Nigeria Data Protection Regulation (NDPR) 2019, you have the right to:

• Access: know what data we hold about you
• Rectification: correct inaccurate data
• Erasure: request permanent deletion of all your data (Right to be Forgotten)
• Portability: download your data in a standard format (JSON/CSV export is available in the app)
• Objection: object to the processing of your data

To exercise any of these rights, use the "Delete My Cloud Data" button in the Backup section of the app, or contact us at ${CONTACT_EMAIL}. We will respond within 30 days.`,
    },
    {
      heading: "Data Retention",
      body: `Your data is retained for as long as your account exists or until you delete it. You may delete all cloud-stored data at any time using the Delete button in the Backup tab. Local data on your device can be cleared by clearing your browser's site data.

If you have not signed in for 24 months, we may delete your cloud backup to comply with data minimisation principles under the NDPR.`,
    },
    {
      heading: "Children",
      body: `MetricHealth is not intended for use by children under the age of 13 without parental supervision. We do not knowingly collect data from children. If you believe a child has used this app without appropriate supervision, please contact us.`,
    },
    {
      heading: "Changes to This Policy",
      body: `We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this document and notify users through the application. Continued use of MetricHealth after changes constitutes acceptance of the revised policy.`,
    },
    {
      heading: "Contact",
      body: `For privacy-related enquiries, data access requests, or data deletion requests:\n\nEmail: ${CONTACT_EMAIL}\nApplication: ${APP_URL}`,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
export const TERMS_OF_SERVICE = {
  title: "Terms of Service",
  sections: [
    {
      heading: "Acceptance of Terms",
      body: `By accessing or using MetricHealth ("the App"), you agree to be bound by these Terms of Service. If you do not agree, do not use the App.

These Terms are governed by the laws of the Federal Republic of Nigeria.`,
    },
    {
      heading: "Description of Service",
      body: `MetricHealth is a personal health-tracking Progressive Web Application (PWA) that allows individuals to log, store, and review personal health readings. The App is provided by an independent developer (Mojeed Fetuga) and is not affiliated with any healthcare institution, hospital, or government health authority.`,
    },
    {
      heading: "Not a Medical Service",
      body: `MetricHealth is a data-logging tool only. It is expressly not:

• A medical device as defined by NAFDAC or any regulatory body
• A clinical decision-support system
• A telemedicine or remote patient monitoring service
• A substitute for consultation with a qualified medical professional

Please read the Medical Disclaimer in full before using the App.`,
    },
    {
      heading: "Free and Pro Plans",
      body: `MetricHealth is available in two tiers:

FREE PLAN: Available to all users at no cost. Includes personal health tracking for one individual, records, charts, range indicators, dark mode, and data export (JSON/CSV).

PRO PLAN (₦5,000 — one-time lifetime payment): Unlocks tracking for unlimited family members, encrypted cloud backup and sync, Excel import/export, print reports, WhatsApp/email sharing, and push reminders.

Payments are processed by Paystack. The ₦5,000 Pro fee is a one-time, non-recurring charge. There are no hidden fees or automatic renewals. All sales are final. Refunds are only issued if Pro features are demonstrably non-functional after a support request to ${CONTACT_EMAIL}.`,
    },
    {
      heading: "User Responsibilities",
      body: `You are responsible for:

• The accuracy of the health data you enter
• Keeping your device, Google account, and PIN secure
• Not sharing your account with others
• Ensuring that any person whose health data you enter into the App has given you their informed consent to do so
• Not using the App for any purpose that violates Nigerian law`,
    },
    {
      heading: "Limitation of Liability",
      body: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE DEVELOPER (MOJEED FETUGA) SHALL NOT BE LIABLE FOR:

• Any health outcome, injury, illness, or death arising from use of or reliance on this App
• Loss of data due to device failure, browser data clearing, or discontinuation of the service
• Decisions made based on health readings, alerts, or information displayed in the App
• Any indirect, incidental, special, or consequential damages

YOUR USE OF METRICHEALTH IS ENTIRELY AT YOUR OWN RISK. THE APP IS PROVIDED "AS IS" WITHOUT ANY WARRANTY, EXPRESS OR IMPLIED.`,
    },
    {
      heading: "Data and Privacy",
      body: `Your use of the App is also governed by our Privacy Policy. For Pro users, health data is encrypted on your device before transmission and stored in an encrypted form on Google Firebase. The developer cannot access or read your encrypted health records.`,
    },
    {
      heading: "Service Availability",
      body: `We make no guarantee of continuous, uninterrupted availability of the App or its cloud features. The service may be modified, suspended, or discontinued at any time. We will provide reasonable notice of any significant changes.

In the event of discontinuation of cloud services, you will be given at least 30 days' notice and the ability to export your data.`,
    },
    {
      heading: "Intellectual Property",
      body: `MetricHealth, its design, code, and content are the intellectual property of Mojeed Fetuga. You may not reproduce, distribute, or create derivative works without written permission.`,
    },
    {
      heading: "Changes to Terms",
      body: `We reserve the right to modify these Terms. Continued use of the App after changes are posted constitutes your acceptance of the new Terms.`,
    },
    {
      heading: "Contact",
      body: `For questions about these Terms:\n\nEmail: ${CONTACT_EMAIL}\nApplication: ${APP_URL}`,
    },
  ],
};
