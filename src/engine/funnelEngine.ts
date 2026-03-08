import { FormData, FunnelResult, FunnelStage, ChannelRecommendation } from "@/types/funnel";

function getBudgetRange(range: string): { min: number; max: number } {
  switch (range) {
    case "low": return { min: 500, max: 2000 };
    case "medium": return { min: 2000, max: 10000 };
    case "high": return { min: 10000, max: 50000 };
    case "veryHigh": return { min: 50000, max: 200000 };
    default: return { min: 1000, max: 5000 };
  }
}

function getStageWeights(data: FormData): Record<string, number> {
  const { mainGoal, salesModel, audienceType } = data;

  if (mainGoal === "awareness") {
    return { awareness: 45, engagement: 25, leads: 15, conversion: 10, retention: 5 };
  }
  if (mainGoal === "leads") {
    return { awareness: 25, engagement: 20, leads: 30, conversion: 20, retention: 5 };
  }
  if (mainGoal === "sales") {
    if (salesModel === "subscription") {
      return { awareness: 20, engagement: 15, leads: 20, conversion: 25, retention: 20 };
    }
    return { awareness: 25, engagement: 15, leads: 20, conversion: 30, retention: 10 };
  }
  if (mainGoal === "loyalty") {
    return { awareness: 10, engagement: 20, leads: 10, conversion: 20, retention: 40 };
  }

  // B2B default adjustment
  if (audienceType === "b2b") {
    return { awareness: 20, engagement: 25, leads: 30, conversion: 20, retention: 5 };
  }

  return { awareness: 25, engagement: 20, leads: 20, conversion: 25, retention: 10 };
}

function getChannelsForStage(
  stageName: string,
  data: FormData
): ChannelRecommendation[] {
  const { audienceType, budgetRange, mainGoal, businessField, averagePrice, existingChannels, experienceLevel } = data;
  const isB2B = audienceType === "b2b";
  const isB2C = audienceType === "b2c" || audienceType === "both";
  const isLowBudget = budgetRange === "low";
  const isHighBudget = budgetRange === "high" || budgetRange === "veryHigh";
  const isHighPrice = averagePrice > 500;
  const isBeginner = experienceLevel === "beginner";

  const channels: ChannelRecommendation[] = [];

  if (stageName === "awareness") {
    if (isB2C) {
      channels.push({
        channel: "instagram",
        name: { he: "אינסטגרם", en: "Instagram" },
        budgetPercent: isLowBudget ? 50 : 35,
        kpis: [
          { he: "חשיפות", en: "Impressions" },
          { he: "עלות לאלף חשיפות (CPM)", en: "Cost per 1000 impressions (CPM)" },
        ],
        tips: [
          { he: "השתמש ברילס לחשיפה מקסימלית", en: "Use Reels for maximum exposure" },
          { he: "שתף פעולה עם משפיעניות בתחום שלך", en: "Collaborate with influencers in your niche" },
        ],
      });
      if (!isLowBudget) {
        channels.push({
          channel: "facebook",
          name: { he: "פייסבוק Ads", en: "Facebook Ads" },
          budgetPercent: 30,
          kpis: [
            { he: "חשיפות", en: "Reach" },
            { he: "עלות לקליק (CPC)", en: "Cost per click (CPC)" },
          ],
          tips: [
            { he: "מקד קהל לפי תחומי עניין ודמוגרפיה", en: "Target audience by interests and demographics" },
          ],
        });
      }
      if (data.ageRange[0] < 30) {
        channels.push({
          channel: "tikTok",
          name: { he: "טיקטוק", en: "TikTok" },
          budgetPercent: isLowBudget ? 30 : 20,
          kpis: [
            { he: "צפיות", en: "Views" },
            { he: "שיתופים", en: "Shares" },
          ],
          tips: [
            { he: "צור תוכן אותנטי וקצר", en: "Create authentic, short content" },
            { he: "עקוב אחרי טרנדים פופולריים", en: "Follow popular trends" },
          ],
        });
      }
    }
    if (isB2B || audienceType === "both") {
      channels.push({
        channel: "linkedIn",
        name: { he: "לינקדאין", en: "LinkedIn" },
        budgetPercent: isB2B ? 40 : 20,
        kpis: [
          { he: "חשיפות", en: "Impressions" },
          { he: "קליקים לפרופיל", en: "Profile clicks" },
        ],
        tips: [
          { he: "שתף תוכן מקצועי ומאמרים", en: "Share professional content and articles" },
          { he: "השתמש במודעות Sponsored Content", en: "Use Sponsored Content ads" },
        ],
      });
      channels.push({
        channel: "google",
        name: { he: "גוגל Ads", en: "Google Ads" },
        budgetPercent: isB2B ? 35 : 25,
        kpis: [
          { he: "עלות לקליק", en: "Cost per click" },
          { he: "שיעור קליקים (CTR)", en: "Click-through rate (CTR)" },
        ],
        tips: [
          { he: "התמקד במילות מפתח ספציפיות לתחום", en: "Focus on industry-specific keywords" },
        ],
      });
    }
    if (isLowBudget && channels.length === 0) {
      channels.push({
        channel: "content",
        name: { he: "תוכן אורגני", en: "Organic Content" },
        budgetPercent: 60,
        kpis: [
          { he: "צפיות", en: "Views" },
          { he: "מעורבות", en: "Engagement" },
        ],
        tips: [
          { he: "צור תוכן ערך שפותר בעיות של הקהל", en: "Create value content that solves audience problems" },
        ],
      });
    }
  }

  if (stageName === "engagement") {
    channels.push({
      channel: "content",
      name: { he: "תוכן איכותי", en: "Quality Content" },
      budgetPercent: 40,
      kpis: [
        { he: "זמן שהייה", en: "Time on page" },
        { he: "שיעור מעורבות", en: "Engagement rate" },
      ],
      tips: isBeginner
        ? [{ he: "התחל עם פוסטים קצרים וסטוריז", en: "Start with short posts and stories" }]
        : [{ he: "צור סדרת תוכן מקצועי עקבית", en: "Create a consistent professional content series" }],
    });
    if (isB2C) {
      channels.push({
        channel: "instagram",
        name: { he: "סטוריז ורילס", en: "Stories & Reels" },
        budgetPercent: 35,
        kpis: [
          { he: "צפיות בסטוריז", en: "Story views" },
          { he: "תגובות", en: "Comments" },
        ],
        tips: [
          { he: "השתמש בסקרים ושאלות לעידוד אינטראקציה", en: "Use polls and questions to encourage interaction" },
        ],
      });
    }
    if (existingChannels.includes("email") || isB2B) {
      channels.push({
        channel: "email",
        name: { he: "שיווק באימייל", en: "Email Marketing" },
        budgetPercent: 25,
        kpis: [
          { he: "שיעור פתיחה", en: "Open rate" },
          { he: "שיעור הקלקה", en: "Click rate" },
        ],
        tips: [
          { he: "שלח ניוזלטר שבועי עם תוכן ערך", en: "Send a weekly newsletter with valuable content" },
        ],
      });
    }
  }

  if (stageName === "leads") {
    channels.push({
      channel: "google",
      name: { he: "גוגל Ads (חיפוש)", en: "Google Ads (Search)" },
      budgetPercent: isHighPrice ? 40 : 30,
      kpis: [
        { he: "עלות ללקוח פוטנציאלי", en: "Cost per lead (CPL)" },
        { he: "מספר לידים", en: "Number of leads" },
      ],
      tips: [
        { he: "בנה דף נחיתה ממוקד עם טופס קצר", en: "Build a focused landing page with a short form" },
      ],
    });
    if (isB2C && !isLowBudget) {
      channels.push({
        channel: "facebook",
        name: { he: "טפסי לידים בפייסבוק", en: "Facebook Lead Forms" },
        budgetPercent: 35,
        kpis: [
          { he: "עלות ללקוח פוטנציאלי", en: "Cost per lead" },
          { he: "איכות לידים", en: "Lead quality" },
        ],
        tips: [
          { he: "הצע הטבה או הנחה בתמורה לפרטים", en: "Offer a benefit or discount in exchange for details" },
        ],
      });
    }
    if (isB2B) {
      channels.push({
        channel: "linkedIn",
        name: { he: "LinkedIn Lead Gen", en: "LinkedIn Lead Gen" },
        budgetPercent: 35,
        kpis: [
          { he: "עלות ללקוח פוטנציאלי", en: "Cost per lead" },
          { he: "שיעור המרת טפסים", en: "Form conversion rate" },
        ],
        tips: [
          { he: "הצע מדריך או וובינר חינמי", en: "Offer a free guide or webinar" },
        ],
      });
    }
    channels.push({
      channel: "content",
      name: { he: "תוכן מגנטי (Lead Magnet)", en: "Lead Magnet Content" },
      budgetPercent: 25,
      kpis: [
        { he: "הורדות", en: "Downloads" },
        { he: "הרשמות", en: "Sign-ups" },
      ],
      tips: [
        { he: "צור מדריך PDF או רשימת בדיקה חינמית", en: "Create a free PDF guide or checklist" },
      ],
    });
  }

  if (stageName === "conversion") {
    if (isB2C) {
      channels.push({
        channel: "google",
        name: { he: "גוגל Shopping / רימרקטינג", en: "Google Shopping / Remarketing" },
        budgetPercent: 40,
        kpis: [
          { he: "שיעור המרה", en: "Conversion rate" },
          { he: "עלות לרכישה (CPA)", en: "Cost per acquisition (CPA)" },
        ],
        tips: [
          { he: "השתמש ברימרקטינג למבקרים שלא השלימו רכישה", en: "Use remarketing for visitors who didn't complete a purchase" },
        ],
      });
    }
    channels.push({
      channel: "email",
      name: { he: "אוטומציית אימייל", en: "Email Automation" },
      budgetPercent: 30,
      kpis: [
        { he: "שיעור המרה מאימייל", en: "Email conversion rate" },
        { he: "הכנסה לאימייל", en: "Revenue per email" },
      ],
      tips: [
        { he: "בנה סדרת מיילים אוטומטית (drip)", en: "Build an automated drip email series" },
        isHighPrice
          ? { he: "הוסף שיחת ייעוץ אישית לפני סגירה", en: "Add a personal consultation call before closing" }
          : { he: "הצע קופון הנחה למתלבטים", en: "Offer a discount coupon for undecided prospects" },
      ],
    });
    if (isB2B || isHighPrice) {
      channels.push({
        channel: "content",
        name: { he: "Case Studies ודמואים", en: "Case Studies & Demos" },
        budgetPercent: 30,
        kpis: [
          { he: "בקשות לדמו", en: "Demo requests" },
          { he: "יחס סגירה", en: "Close rate" },
        ],
        tips: [
          { he: "הכן סיפורי הצלחה של לקוחות", en: "Prepare customer success stories" },
        ],
      });
    }
  }

  if (stageName === "retention") {
    channels.push({
      channel: "email",
      name: { he: "שיווק באימייל לשימור", en: "Retention Email Marketing" },
      budgetPercent: 40,
      kpis: [
        { he: "שיעור שימור לקוחות", en: "Customer retention rate" },
        { he: "ערך חיי לקוח (LTV)", en: "Customer lifetime value (LTV)" },
      ],
      tips: [
        { he: "שלח הצעות מותאמות אישית ללקוחות קיימים", en: "Send personalized offers to existing customers" },
      ],
    });
  if (data.salesModel === "subscription") {
      channels.push({
        channel: "content",
        name: { he: "תוכן בלעדי למנויים", en: "Exclusive Subscriber Content" },
        budgetPercent: 35,
        kpis: [
          { he: "שיעור חידוש מנויים", en: "Subscription renewal rate" },
          { he: "NPS", en: "NPS" },
        ],
        tips: [
          { he: "צור קהילה סביב המותג", en: "Build a community around the brand" },
        ],
      });
    }
    channels.push({
      channel: "facebook",
      name: { he: "קהילת לקוחות", en: "Customer Community" },
      budgetPercent: salesModel === "subscription" ? 25 : 35,
      kpis: [
        { he: "מעורבות בקהילה", en: "Community engagement" },
        { he: "המלצות", en: "Referrals" },
      ],
      tips: [
        { he: "הקם קבוצת VIP ללקוחות נאמנים", en: "Create a VIP group for loyal customers" },
      ],
    });
  }

  // Normalize budget percentages
  const total = channels.reduce((sum, c) => sum + c.budgetPercent, 0);
  if (total > 0) {
    channels.forEach((c) => {
      c.budgetPercent = Math.round((c.budgetPercent / total) * 100);
    });
  }

  return channels;
}

function getFunnelName(data: FormData): { he: string; en: string } {
  const fieldNames: Record<string, { he: string; en: string }> = {
    fashion: { he: "אופנה ויופי", en: "Fashion & Beauty" },
    tech: { he: "טכנולוגיה", en: "Technology" },
    food: { he: "מזון", en: "Food" },
    services: { he: "שירותים", en: "Services" },
    education: { he: "חינוך", en: "Education" },
    health: { he: "בריאות", en: "Health" },
    realEstate: { he: "נדל\"ן", en: "Real Estate" },
    tourism: { he: "תיירות", en: "Tourism" },
    other: { he: "עסק", en: "Business" },
  };

  const goalNames: Record<string, { he: string; en: string }> = {
    awareness: { he: "מודעות", en: "Awareness" },
    leads: { he: "לידים", en: "Leads" },
    sales: { he: "מכירות", en: "Sales" },
    loyalty: { he: "שימור", en: "Retention" },
  };

  const field = fieldNames[data.businessField] || fieldNames.other;
  const goal = goalNames[data.mainGoal as string] || goalNames.sales;

  return {
    he: `משפך ${goal.he} - ${field.he}`,
    en: `${goal.en} Funnel - ${field.en}`,
  };
}

function getOverallTips(data: FormData): { he: string; en: string }[] {
  const tips: { he: string; en: string }[] = [];
  const { audienceType, budgetRange, mainGoal, businessField, existingChannels, experienceLevel, salesModel, averagePrice, ageRange } = data;

  if (experienceLevel === "beginner") {
    tips.push({
      he: "💡 התחל עם ערוץ אחד או שניים והתרחב בהדרגה",
      en: "💡 Start with one or two channels and expand gradually",
    });
  }

  if (budgetRange === "low") {
    tips.push({
      he: "💰 עם תקציב מוגבל, התמקד בתוכן אורגני ושיווק ברשתות חברתיות",
      en: "💰 With a limited budget, focus on organic content and social media marketing",
    });
  }

  if (audienceType === "b2c" && ageRange[0] < 30) {
    tips.push({
      he: "🎯 כדאי לבדוק גם טיקטוק ופינטרסט לקהל הצעיר",
      en: "🎯 Consider also trying TikTok and Pinterest for the younger audience",
    });
  }

  if (audienceType === "b2b") {
    tips.push({
      he: "🏢 בשיווק B2B, מחזור המכירה ארוך יותר – תכנן תוכן לכל שלב",
      en: "🏢 In B2B marketing, the sales cycle is longer – plan content for each stage",
    });
  }

  if (salesModel === "subscription") {
    tips.push({
      he: "🔄 במודל מנוי, שימור לקוחות חשוב לא פחות מגיוס חדשים",
      en: "🔄 In a subscription model, retaining customers is as important as acquiring new ones",
    });
  }

  if (averagePrice > 1000) {
    tips.push({
      he: "💎 עם מחיר גבוה, השקע ביצירת אמון – ביקורות, המלצות, Case Studies",
      en: "💎 With a high price point, invest in building trust – reviews, testimonials, case studies",
    });
  }

  if (!existingChannels.includes("email")) {
    tips.push({
      he: "📧 מומלץ לבנות רשימת תפוצה – אימייל הוא ערוץ עם ROI הגבוה ביותר",
      en: "📧 Recommended to build a mailing list – email has the highest ROI of any channel",
    });
  }

  if (businessField === "fashion" || businessField === "food") {
    tips.push({
      he: "📸 בתחום שלך, תוכן ויזואלי הוא המפתח – השקע בצילום איכותי",
      en: "📸 In your field, visual content is key – invest in quality photography",
    });
  }

  return tips.slice(0, 5);
}

function getKpis(data: FormData): { name: { he: string; en: string }; target: string }[] {
  const kpis: { name: { he: string; en: string }; target: string }[] = [];

  kpis.push({
    name: { he: "עלות לקליק (CPC)", en: "Cost per Click (CPC)" },
    target: data.audienceType === "b2b" ? "₪3-8" : "₪1-4",
  });

  if (data.mainGoal === "leads" || data.mainGoal === "sales") {
    kpis.push({
      name: { he: "עלות ללקוח פוטנציאלי (CPL)", en: "Cost per Lead (CPL)" },
      target: data.audienceType === "b2b" ? "₪50-200" : "₪15-60",
    });
  }

  if (data.mainGoal === "sales") {
    kpis.push({
      name: { he: "עלות לרכישה (CPA)", en: "Cost per Acquisition (CPA)" },
      target: data.averagePrice > 500 ? "₪100-500" : "₪30-150",
    });
    kpis.push({
      name: { he: "שיעור המרה", en: "Conversion Rate" },
      target: data.audienceType === "b2b" ? "2-5%" : "1-3%",
    });
  }

  if (data.mainGoal === "awareness") {
    kpis.push({
      name: { he: "עלות לאלף חשיפות (CPM)", en: "Cost per 1000 Impressions (CPM)" },
      target: "₪15-40",
    });
    kpis.push({
      name: { he: "שיעור מעורבות", en: "Engagement Rate" },
      target: "3-7%",
    });
  }

  if (data.mainGoal === "loyalty" || data.salesModel === "subscription") {
    kpis.push({
      name: { he: "שיעור שימור", en: "Retention Rate" },
      target: "70-90%",
    });
    kpis.push({
      name: { he: "ערך חיי לקוח (LTV)", en: "Customer Lifetime Value (LTV)" },
      target: `₪${data.averagePrice * 3}-${data.averagePrice * 12}`,
    });
  }

  kpis.push({
    name: { he: "ROI שיווקי", en: "Marketing ROI" },
    target: "200-400%",
  });

  return kpis;
}

export function generateFunnel(data: FormData): FunnelResult {
  const weights = getStageWeights(data);
  const budget = getBudgetRange(data.budgetRange);

  const stageDefinitions = [
    { id: "awareness", name: { he: "מודעות", en: "Awareness" }, desc: { he: "הגברת הנראות והמודעות למותג שלך", en: "Increasing visibility and brand awareness" } },
    { id: "engagement", name: { he: "מעורבות", en: "Engagement" }, desc: { he: "יצירת עניין ואינטראקציה עם הקהל", en: "Creating interest and audience interaction" } },
    { id: "leads", name: { he: "לידים", en: "Leads" }, desc: { he: "איסוף פרטי לקוחות פוטנציאליים", en: "Collecting potential customer details" } },
    { id: "conversion", name: { he: "המרה", en: "Conversion" }, desc: { he: "הפיכת מתעניינים ללקוחות משלמים", en: "Converting prospects into paying customers" } },
    { id: "retention", name: { he: "שימור", en: "Retention" }, desc: { he: "שמירה על לקוחות קיימים ועידוד רכישות חוזרות", en: "Retaining existing customers and encouraging repeat purchases" } },
  ];

  const stages: FunnelStage[] = stageDefinitions.map((stage) => ({
    id: stage.id,
    name: stage.name,
    budgetPercent: weights[stage.id] || 0,
    channels: getChannelsForStage(stage.id, data),
    description: stage.desc,
  }));

  // Filter out stages with 0 budget (unless all have budget)
  const activeStages = stages.filter((s) => s.budgetPercent > 0);

  return {
    id: crypto.randomUUID(),
    funnelName: getFunnelName(data),
    stages: activeStages.length > 0 ? activeStages : stages,
    totalBudget: budget,
    overallTips: getOverallTips(data),
    kpis: getKpis(data),
    createdAt: new Date().toISOString(),
    formData: data,
  };
}
