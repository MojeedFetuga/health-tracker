// ─────────────────────────────────────────────────────────────────────────────
// Get your public key from: dashboard.paystack.com → Settings → API Keys
// Use pk_test_... for testing, pk_live_... for real payments
// ─────────────────────────────────────────────────────────────────────────────
export const PAYSTACK_PUBLIC_KEY = ""; // ← paste your key here

// Single one-time lifetime plan
export const PLANS = {
  lifetime: {
    amount:  500000,           // kobo (₦5,000)
    label:   "₦5,000",
    period:  "one-time · forever",
    badge:   "Lifetime Access",
  },
};

export const IS_PAYSTACK_CONFIGURED = !!PAYSTACK_PUBLIC_KEY;
