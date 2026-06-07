// ─────────────────────────────────────────────────────────────────────────────
// Get your public key from: dashboard.paystack.com → Settings → API Keys
// Use pk_test_... for testing, pk_live_... for real payments
// ─────────────────────────────────────────────────────────────────────────────
export const PAYSTACK_PUBLIC_KEY = ""; // ← paste your key here

export const PLANS = {
  monthly: {
    amount:  150000,      // kobo (₦1,500)
    label:   "₦1,500",
    period:  "/month",
    months:  1,
    badge:   null,
  },
  yearly: {
    amount:  1200000,     // kobo (₦12,000)
    label:   "₦12,000",
    period:  "/year",
    months:  12,
    badge:   "Save 33%",
  },
};

export const IS_PAYSTACK_CONFIGURED = !!PAYSTACK_PUBLIC_KEY;
