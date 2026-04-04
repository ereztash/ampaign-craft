/**
 * Israeli Tool Recommendations Engine
 * Maps marketing channels to recommended Israeli tools for execution.
 * FunnelForge generates strategy; these tools execute it.
 */

export interface ToolRecommendation {
  channel: string;
  tool: string;
  description: { he: string; en: string };
  why: { he: string; en: string };
  pricing: { he: string; en: string };
  url: string;
  israeliMade: boolean;
}

const toolDatabase: ToolRecommendation[] = [
  // Email / Marketing Automation
  {
    channel: "email",
    tool: "ActiveTrail",
    description: { he: "מערכת אוטומציית שיווק ישראלית מובילה", en: "Israel's leading marketing automation platform" },
    why: { he: "עברית מלאה, תמחור בשקלים, תמיכה מקומית, אוטומציות מתקדמות", en: "Full Hebrew UI, NIS pricing, local support, advanced automations" },
    pricing: { he: "החל מ-50 ₪/חודש", en: "From ₪50/month" },
    url: "activetrail.co.il",
    israeliMade: true,
  },
  // WhatsApp
  {
    channel: "whatsapp",
    tool: "ActiveTrail",
    description: { he: "שליחת הודעות WhatsApp אוטומטיות דרך ActiveTrail", en: "Automated WhatsApp messages via ActiveTrail" },
    why: { he: "ערוץ WhatsApp משולב במערכת האוטומציה – שיעור פתיחה 98%", en: "WhatsApp channel integrated in automation system – 98% open rate" },
    pricing: { he: "תמחור מותאם לפי נפח", en: "Custom pricing by volume" },
    url: "activetrail.co.il",
    israeliMade: true,
  },
  // Website / Landing Pages
  {
    channel: "content",
    tool: "Wix",
    description: { he: "בניית אתרים ודפי נחיתה עם כלי שיווק מובנים", en: "Website & landing page builder with built-in marketing tools" },
    why: { he: "חברה ישראלית, עברית מלאה, שילוב עם שערי תשלום ישראליים", en: "Israeli company, full Hebrew, integration with Israeli payment gateways" },
    pricing: { he: "החל מ-$17/חודש", en: "From $17/month" },
    url: "wix.com",
    israeliMade: true,
  },
  {
    channel: "content",
    tool: "Elementor",
    description: { he: "בונה דפים ומשפכים ב-WordPress – הפלאגין הפופולרי בעולם", en: "WordPress page & funnel builder – world's most popular plugin" },
    why: { he: "חברה ישראלית, RTL מושלם, קהילה ישראלית ענקית, גמישות מלאה", en: "Israeli company, perfect RTL, huge Israeli community, full flexibility" },
    pricing: { he: "חינם / $59-$399 לשנה", en: "Free / $59-$399/year" },
    url: "elementor.com",
    israeliMade: true,
  },
  // Project Management / CRM
  {
    channel: "other",
    tool: "Monday.com",
    description: { he: "ניהול פרויקטים, CRM וקמפיינים שיווקיים", en: "Project management, CRM, and marketing campaigns" },
    why: { he: "חברה ישראלית, CRM מובנה, AI Agents לאוטומציה, ניהול קמפיינים", en: "Israeli company, built-in CRM, AI Agents for automation, campaign management" },
    pricing: { he: "חינם / $9-$19 למשתמש/חודש", en: "Free / $9-$19/user/month" },
    url: "monday.com",
    israeliMade: true,
  },
  // Native Advertising
  {
    channel: "google",
    tool: "Outbrain",
    description: { he: "קידום תוכן נייטיב על אתרי פרימיום (Ynet, CNN, MSN)", en: "Native content promotion on premium sites (Ynet, CNN, MSN)" },
    why: { he: "חברה ישראלית, חשיפה על 7,000+ אתרי פרימיום, אופטימיזציה ב-AI", en: "Israeli company, exposure on 7,000+ premium sites, AI optimization" },
    pricing: { he: "לפי קליק (CPC) – החל מ-~$0.10", en: "Per click (CPC) – from ~$0.10" },
    url: "outbrain.com",
    israeliMade: true,
  },
  // Facebook / Instagram
  {
    channel: "facebook",
    tool: "ActiveTrail",
    description: { he: "רטרגטינג ברשתות חברתיות דרך Smart Pixel", en: "Social retargeting via Smart Pixel" },
    why: { he: "שילוב מובנה עם Facebook Ads – רטרגטינג חכם מבוסס התנהגות", en: "Built-in Facebook Ads integration – behavior-based smart retargeting" },
    pricing: { he: "כלול בתוכנית Plus (60 ₪/חודש)", en: "Included in Plus plan (₪60/month)" },
    url: "activetrail.co.il",
    israeliMade: true,
  },
  {
    channel: "instagram",
    tool: "Wix",
    description: { he: "ניהול פוסטים לרשתות חברתיות מתוך Wix", en: "Social media post management from Wix" },
    why: { he: "ניהול ופרסום ישירות מהאתר שלך – פשוט ומרוכז", en: "Manage and publish directly from your site – simple and centralized" },
    pricing: { he: "כלול בתוכניות עסקיות", en: "Included in business plans" },
    url: "wix.com",
    israeliMade: true,
  },
];

/**
 * Get tool recommendations for a specific channel
 */
export function getToolsForChannel(channel: string): ToolRecommendation[] {
  return toolDatabase.filter((t) => t.channel === channel);
}

/**
 * Get all unique tool recommendations for a set of channels
 */
export function getToolsForChannels(channels: string[]): ToolRecommendation[] {
  const seen = new Set<string>();
  return toolDatabase.filter((t) => {
    if (!channels.includes(t.channel)) return false;
    const key = `${t.tool}-${t.channel}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Get summary of all Israeli tools for strategy section
 */
export function getIsraeliToolsSummary(): { tool: string; role: { he: string; en: string } }[] {
  return [
    { tool: "ActiveTrail", role: { he: "אימייל, SMS, WhatsApp – אוטומציית שיווק", en: "Email, SMS, WhatsApp – marketing automation" } },
    { tool: "Monday.com", role: { he: "ניהול פרויקטים, CRM, ניהול קמפיינים", en: "Project management, CRM, campaign management" } },
    { tool: "Wix", role: { he: "בניית אתרים, דפי נחיתה, חנות אונליין", en: "Website, landing pages, online store" } },
    { tool: "Elementor", role: { he: "בניית דפים ומשפכים ב-WordPress", en: "Page & funnel building on WordPress" } },
    { tool: "Outbrain", role: { he: "קידום תוכן נייטיב על אתרי פרימיום", en: "Native content promotion on premium sites" } },
  ];
}
