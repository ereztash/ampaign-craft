/**
 * Single source of truth for business / legal contact details.
 * Required by Israeli payment processors (סולק) for site approval.
 * Update values here — they propagate to Footer, Contact, Refund Policy, Terms.
 */
export const BUSINESS_INFO = {
  // Legal name — placeholder until provided
  legalName: {
    he: "FunnelForge",
    en: "FunnelForge",
  },
  // Brand / display name
  brandName: "FunnelForge",
  // ע.מ. / ח.פ.
  vatId: "318854676",
  vatIdLabel: {
    he: "ע.מ.",
    en: "Business ID",
  },
  address: {
    street: {
      he: "התנאים 5",
      en: "HaTna'im 5",
    },
    city: {
      he: "רמת גן",
      en: "Ramat Gan",
    },
    country: {
      he: "ישראל",
      en: "Israel",
    },
    full: {
      he: "התנאים 5, רמת גן, ישראל",
      en: "HaTna'im 5, Ramat Gan, Israel",
    },
  },
  phone: {
    display: "052-454-5963",
    tel: "+972524545963",
  },
  email: "Erez2812345@gmail.com",
  hours: {
    he: "ימים א'–ה', 09:00–18:00 (שעון ישראל)",
    en: "Sun–Thu, 09:00–18:00 (Israel time)",
  },
  responseSla: {
    he: "עד 48 שעות בימי עסקים",
    en: "Within 48 business hours",
  },
} as const;
