/**
 * Israeli Industry Benchmarks
 * Average marketing KPIs by business field in the Israeli market.
 */

export interface IndustryBenchmark {
  metric: { he: string; en: string };
  value: string;
  context: { he: string; en: string };
}

const benchmarkData: Record<string, IndustryBenchmark[]> = {
  fashion: [
    { metric: { he: "CPC ממוצע", en: "Average CPC" }, value: "₪1.80-3.50", context: { he: "פייסבוק/אינסטגרם", en: "Facebook/Instagram" } },
    { metric: { he: "שיעור המרה", en: "Conversion Rate" }, value: "1.5-3.2%", context: { he: "חנות אונליין", en: "Online store" } },
    { metric: { he: "CPM ממוצע", en: "Average CPM" }, value: "₪25-45", context: { he: "מודעות וידאו", en: "Video ads" } },
    { metric: { he: "ROAS ממוצע", en: "Average ROAS" }, value: "3.5-5.0x", context: { he: "קמפיינים ממוקדים", en: "Targeted campaigns" } },
    { metric: { he: "עלות לרכישה", en: "CPA" }, value: "₪45-120", context: { he: "לקוח חדש", en: "New customer" } },
  ],
  tech: [
    { metric: { he: "CPC ממוצע", en: "Average CPC" }, value: "₪5-15", context: { he: "גוגל Ads – B2B", en: "Google Ads – B2B" } },
    { metric: { he: "CPL ממוצע", en: "Average CPL" }, value: "₪80-350", context: { he: "ליד מוסמך", en: "Qualified lead" } },
    { metric: { he: "שיעור המרה", en: "Conversion Rate" }, value: "2-5%", context: { he: "דף נחיתה", en: "Landing page" } },
    { metric: { he: "Pipeline Velocity", en: "Pipeline Velocity" }, value: "₪100K-500K/mo", context: { he: "B2B SaaS", en: "B2B SaaS" } },
    { metric: { he: "CAC Payback", en: "CAC Payback" }, value: "6-18 months", context: { he: "SaaS ישראלי", en: "Israeli SaaS" } },
  ],
  food: [
    { metric: { he: "CPC ממוצע", en: "Average CPC" }, value: "₪0.80-2.50", context: { he: "פייסבוק/אינסטגרם", en: "Facebook/Instagram" } },
    { metric: { he: "שיעור מעורבות", en: "Engagement Rate" }, value: "4-8%", context: { he: "תוכן ויזואלי", en: "Visual content" } },
    { metric: { he: "שיעור המרה", en: "Conversion Rate" }, value: "2-4%", context: { he: "הזמנות אונליין", en: "Online orders" } },
    { metric: { he: "עלות לליד", en: "CPL" }, value: "₪10-35", context: { he: "מנוי לניוזלטר/דיל", en: "Newsletter/deal signup" } },
    { metric: { he: "LTV ממוצע", en: "Average LTV" }, value: "₪800-2,500", context: { he: "לקוח חוזר", en: "Repeat customer" } },
  ],
  services: [
    { metric: { he: "CPL ממוצע", en: "Average CPL" }, value: "₪30-150", context: { he: "ליד לשירות", en: "Service lead" } },
    { metric: { he: "שיעור סגירה", en: "Close Rate" }, value: "15-30%", context: { he: "מליד ללקוח", en: "Lead to customer" } },
    { metric: { he: "CPC ממוצע", en: "Average CPC" }, value: "₪3-10", context: { he: "גוגל Ads", en: "Google Ads" } },
    { metric: { he: "NPS ממוצע", en: "Average NPS" }, value: "40-65", context: { he: "שירותים מקצועיים", en: "Professional services" } },
    { metric: { he: "שיעור שימור", en: "Retention Rate" }, value: "70-85%", context: { he: "לקוח שנתי", en: "Annual client" } },
  ],
  education: [
    { metric: { he: "CPL ממוצע", en: "Average CPL" }, value: "₪20-80", context: { he: "הרשמה לקורס", en: "Course enrollment" } },
    { metric: { he: "שיעור המרה", en: "Conversion Rate" }, value: "3-8%", context: { he: "מהרשמה לתשלום", en: "Signup to purchase" } },
    { metric: { he: "CPC ממוצע", en: "Average CPC" }, value: "₪2-6", context: { he: "פייסבוק Ads", en: "Facebook Ads" } },
    { metric: { he: "LTV ממוצע", en: "Average LTV" }, value: "₪1,500-5,000", context: { he: "תלמיד", en: "Student" } },
    { metric: { he: "שיעור השלמה", en: "Completion Rate" }, value: "30-65%", context: { he: "קורס דיגיטלי", en: "Digital course" } },
  ],
  health: [
    { metric: { he: "CPL ממוצע", en: "Average CPL" }, value: "₪25-100", context: { he: "ליד לשירות בריאות", en: "Health service lead" } },
    { metric: { he: "CPC ממוצע", en: "Average CPC" }, value: "₪2-7", context: { he: "גוגל Ads", en: "Google Ads" } },
    { metric: { he: "שיעור המרה", en: "Conversion Rate" }, value: "2-5%", context: { he: "קביעת תור/הרשמה", en: "Booking/signup" } },
    { metric: { he: "שיעור שימור", en: "Retention Rate" }, value: "65-85%", context: { he: "מנוי חודשי", en: "Monthly subscription" } },
    { metric: { he: "NPS ממוצע", en: "Average NPS" }, value: "50-75", context: { he: "מרוצים מהשירות", en: "Service satisfaction" } },
  ],
  realEstate: [
    { metric: { he: "CPL ממוצע", en: "Average CPL" }, value: "₪50-300", context: { he: "ליד נדל\"ן", en: "Real estate lead" } },
    { metric: { he: "CPC ממוצע", en: "Average CPC" }, value: "₪5-20", context: { he: "גוגל Ads", en: "Google Ads" } },
    { metric: { he: "שיעור סגירה", en: "Close Rate" }, value: "3-10%", context: { he: "מליד לעסקה", en: "Lead to deal" } },
    { metric: { he: "זמן ממוצע לסגירה", en: "Average Time to Close" }, value: "30-90 days", context: { he: "עסקת נדל\"ן", en: "Real estate deal" } },
    { metric: { he: "עלות לסגירה", en: "Cost per Close" }, value: "₪2,000-8,000", context: { he: "עסקה חדשה", en: "New deal" } },
  ],
  tourism: [
    { metric: { he: "CPC ממוצע", en: "Average CPC" }, value: "₪1.50-5", context: { he: "פייסבוק/גוגל", en: "Facebook/Google" } },
    { metric: { he: "שיעור המרה", en: "Conversion Rate" }, value: "1.5-4%", context: { he: "הזמנה מקוונת", en: "Online booking" } },
    { metric: { he: "ROAS ממוצע", en: "Average ROAS" }, value: "4-8x", context: { he: "קמפיין עונתי", en: "Seasonal campaign" } },
    { metric: { he: "ערך הזמנה ממוצע", en: "Avg. Booking Value" }, value: "₪1,500-5,000", context: { he: "חבילת תיירות", en: "Tourism package" } },
    { metric: { he: "שיעור ביטול", en: "Cancellation Rate" }, value: "15-25%", context: { he: "הזמנות אונליין", en: "Online bookings" } },
  ],
  personalBrand: [
    { metric: { he: "CPL ממוצע", en: "Average CPL" }, value: "₪15-80", context: { he: "ליד לייעוץ/קורס", en: "Consulting/course lead" } },
    { metric: { he: "שיעור מעורבות", en: "Engagement Rate" }, value: "5-12%", context: { he: "לינקדאין/אינסטגרם", en: "LinkedIn/Instagram" } },
    { metric: { he: "שיעור סגירה", en: "Close Rate" }, value: "20-40%", context: { he: "שיחת ייעוץ", en: "Consultation call" } },
    { metric: { he: "LTV ממוצע", en: "Average LTV" }, value: "₪3,000-15,000", context: { he: "לקוח ייעוצי", en: "Consulting client" } },
    { metric: { he: "NPS ממוצע", en: "Average NPS" }, value: "55-80", context: { he: "מותג אישי", en: "Personal brand" } },
  ],
  other: [
    { metric: { he: "CPC ממוצע", en: "Average CPC" }, value: "₪2-8", context: { he: "ממוצע כללי", en: "General average" } },
    { metric: { he: "שיעור המרה", en: "Conversion Rate" }, value: "1.5-4%", context: { he: "ממוצע כללי", en: "General average" } },
    { metric: { he: "CPL ממוצע", en: "Average CPL" }, value: "₪25-120", context: { he: "ליד כללי", en: "General lead" } },
    { metric: { he: "ROAS ממוצע", en: "Average ROAS" }, value: "3-5x", context: { he: "קמפיינים דיגיטליים", en: "Digital campaigns" } },
    { metric: { he: "ROI שיווקי", en: "Marketing ROI" }, value: "200-400%", context: { he: "ממוצע שוק", en: "Market average" } },
  ],
};

export function getIndustryBenchmarks(businessField: string): IndustryBenchmark[] {
  return benchmarkData[businessField] || benchmarkData.other;
}
