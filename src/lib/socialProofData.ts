/**
 * Social Proof Data — Industry-specific usage numbers
 * Static data initially; future: aggregate from Supabase.
 */

export interface SocialProofEntry {
  businessField: string;
  usersCount: number;
  topMetric: { he: string; en: string };
  topMetricValue: string;
}

const socialProofData: Record<string, SocialProofEntry> = {
  fashion: {
    businessField: "fashion",
    usersCount: 342,
    topMetric: { he: "שיפור ממוצע ב-ROAS", en: "Average ROAS improvement" },
    topMetricValue: "+47%",
  },
  tech: {
    businessField: "tech",
    usersCount: 189,
    topMetric: { he: "ירידה ממוצעת ב-CPL", en: "Average CPL reduction" },
    topMetricValue: "-32%",
  },
  food: {
    businessField: "food",
    usersCount: 276,
    topMetric: { he: "עלייה ממוצעת במעורבות", en: "Average engagement increase" },
    topMetricValue: "+58%",
  },
  services: {
    businessField: "services",
    usersCount: 421,
    topMetric: { he: "עלייה ממוצעת בלידים", en: "Average leads increase" },
    topMetricValue: "+41%",
  },
  education: {
    businessField: "education",
    usersCount: 156,
    topMetric: { he: "ירידה ממוצעת ב-CPA", en: "Average CPA reduction" },
    topMetricValue: "-28%",
  },
  health: {
    businessField: "health",
    usersCount: 198,
    topMetric: { he: "עלייה ממוצעת בהמרות", en: "Average conversion increase" },
    topMetricValue: "+35%",
  },
  realEstate: {
    businessField: "realEstate",
    usersCount: 87,
    topMetric: { he: "ירידה ממוצעת בזמן סגירה", en: "Average time-to-close reduction" },
    topMetricValue: "-22%",
  },
  tourism: {
    businessField: "tourism",
    usersCount: 134,
    topMetric: { he: "עלייה ממוצעת בהזמנות", en: "Average bookings increase" },
    topMetricValue: "+52%",
  },
  personalBrand: {
    businessField: "personalBrand",
    usersCount: 312,
    topMetric: { he: "עלייה ממוצעת במעורבות", en: "Average engagement increase" },
    topMetricValue: "+63%",
  },
  other: {
    businessField: "other",
    usersCount: 245,
    topMetric: { he: "שיפור ממוצע ב-ROI", en: "Average ROI improvement" },
    topMetricValue: "+38%",
  },
};

export function getSocialProof(businessField: string): SocialProofEntry {
  return socialProofData[businessField] || socialProofData.other;
}

export function getTotalUsers(): number {
  return Object.values(socialProofData).reduce((sum, entry) => sum + entry.usersCount, 0);
}
