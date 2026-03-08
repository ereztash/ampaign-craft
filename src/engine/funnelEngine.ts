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
    return { awareness: 20, engagement: 20, leads: 30, conversion: 20, retention: 10 };
  }
  if (mainGoal === "sales") {
    if (salesModel === "subscription") {
      return { awareness: 15, engagement: 15, leads: 20, conversion: 25, retention: 25 };
    }
    return { awareness: 20, engagement: 15, leads: 20, conversion: 30, retention: 15 };
  }
  if (mainGoal === "loyalty") {
    return { awareness: 10, engagement: 15, leads: 10, conversion: 20, retention: 45 };
  }

  // B2B Δ-Navigator default: heavier on engagement (thought leadership) and leads (diagnostic)
  if (audienceType === "b2b") {
    return { awareness: 20, engagement: 25, leads: 25, conversion: 20, retention: 10 };
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

  // ═══════════════════════════════════════════════
  // STAGE: AWARENESS — ICP Targeting & Pain Discovery
  // ═══════════════════════════════════════════════
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
          { he: "השתמש ברילס לחשיפה מקסימלית – UGC מניב ביצועים טובים ב-93% מהמקרים לעומת תוכן ממותג", en: "Use Reels for maximum exposure – UGC outperforms branded content in 93% of cases" },
          { he: "שתף פעולה עם מיקרו-משפיענים (ROI של $5.78 לכל $1 שהושקע)", en: "Collaborate with micro-influencers (ROI of $5.78 per $1 spent)" },
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
            { he: "מקד קהל לפי תחומי עניין ודמוגרפיה – 71% מהצרכנים מצפים להתאמה אישית", en: "Target audience by interests and demographics – 71% of consumers expect personalization" },
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
            { he: "צור תוכן אותנטי וקצר – אותנטיות גוברת על ערכי הפקה גבוהים בכלכלת הקשב", en: "Create authentic, short content – authenticity beats high production values in the attention economy" },
            { he: "עקוב אחרי טרנדים – הקהל שלך חשוף ל-4,000-10,000 מודעות ביום", en: "Follow trends – your audience sees 4,000-10,000 ads daily" },
          ],
        });
      }
    }
    if (isB2B || audienceType === "both") {
      channels.push({
        channel: "linkedIn",
        name: { he: "לינקדאין – ICP טרגוט", en: "LinkedIn – ICP Targeting" },
        budgetPercent: isB2B ? 40 : 20,
        kpis: [
          { he: "חשיפות ל-ICP", en: "ICP Impressions" },
          { he: "קליקים לפרופיל", en: "Profile clicks" },
        ],
        tips: [
          { he: "זהה את ה-ICP (Ideal Customer Profile) ומפה את הכאב העסקי שלו – תפקד כ'מנטור' שמבין את ה'נבל'", en: "Identify your ICP (Ideal Customer Profile) and map their business pain – act as the 'Mentor' who understands the 'Villain'" },
          { he: "השתמש במודעות Thought Leadership – 79% מקבלי ההחלטות מושפעים מתוכן סמכותי", en: "Use Thought Leadership ads – 79% of decision-makers are influenced by authoritative content" },
        ],
      });
      channels.push({
        channel: "google",
        name: { he: "גוגל Ads – Pain Keywords", en: "Google Ads – Pain Keywords" },
        budgetPercent: isB2B ? 35 : 25,
        kpis: [
          { he: "עלות לקליק", en: "Cost per click" },
          { he: "שיעור קליקים (CTR)", en: "Click-through rate (CTR)" },
        ],
        tips: [
          { he: "התמקד במילות מפתח שמבטאות כאב עסקי ('איך לפתור...', 'שיפור...') ולא רק מילות מוצר", en: "Focus on pain-expressing keywords ('how to solve...', 'improve...') not just product keywords" },
        ],
      });
    }
    if (isLowBudget && channels.length === 0) {
      channels.push({
        channel: "content",
        name: { he: "תוכן אורגני – בניית סמכות", en: "Organic Content – Authority Building" },
        budgetPercent: 60,
        kpis: [
          { he: "צפיות", en: "Views" },
          { he: "מעורבות", en: "Engagement" },
        ],
        tips: [
          { he: "תוכן שיווקי מייצר פי 3 יותר לידים ב-62% פחות עלות – השקע בתוכן ערך שפותר בעיות אמיתיות", en: "Content marketing generates 3x more leads at 62% less cost – invest in value content solving real problems" },
        ],
      });
    }
  }

  // ═══════════════════════════════════════════════
  // STAGE: ENGAGEMENT — Thought Leadership & Trust Moat
  // ═══════════════════════════════════════════════
  if (stageName === "engagement") {
    if (isB2B) {
      channels.push({
        channel: "content",
        name: { he: "Thought Leadership – דוחות ותובנות", en: "Thought Leadership – Reports & Insights" },
        budgetPercent: 40,
        kpis: [
          { he: "זמן שהייה ממוצע", en: "Avg. time on page" },
          { he: "שיתופים של תוכן מומחיות", en: "Expertise content shares" },
        ],
        tips: [
          { he: "פרסם דוחות תעשייה ייחודיים – זו ה'תעלת אמון' (Trust Moat) שמבדילה אותך מהמתחרים", en: "Publish unique industry reports – this is the 'Trust Moat' that differentiates you from competitors" },
          { he: "הפוך Case Studies ל'אפוסים של הצלחה' – ספר מאבק, פיבוט וניצחון, לא רק תוצאות", en: "Turn Case Studies into 'Success Epics' – tell the struggle, pivot, and victory, not just results" },
        ],
      });
      channels.push({
        channel: "linkedIn",
        name: { he: "לינקדאין – סמכות מותגית", en: "LinkedIn – Brand Authority" },
        budgetPercent: 35,
        kpis: [
          { he: "מעורבות בפוסטים", en: "Post engagement" },
          { he: "עוקבים חדשים (ICP)", en: "New followers (ICP)" },
        ],
        tips: [
          { he: "שתף תובנות מקוריות מניסיון שטח – מנהלים סומכים יותר על מומחים שמשתפים ידע חופשי", en: "Share original field insights – executives trust experts who share knowledge freely" },
        ],
      });
    } else {
      channels.push({
        channel: "content",
        name: { he: "תוכן איכותי", en: "Quality Content" },
        budgetPercent: 40,
        kpis: [
          { he: "זמן שהייה", en: "Time on page" },
          { he: "שיעור מעורבות", en: "Engagement rate" },
        ],
        tips: isBeginner
          ? [{ he: "התחל עם פוסטים קצרים וסטוריז – אותנטיות חשובה יותר מעריכה מושלמת", en: "Start with short posts and stories – authenticity matters more than perfect editing" }]
          : [{ he: "צור סדרת תוכן מקצועי עקבית – עקביות בונה אמון לאורך זמן", en: "Create a consistent professional content series – consistency builds trust over time" }],
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
            { he: "השתמש בסקרים ושאלות – UGC משפיע על 79% מהחלטות הרכישה של הצרכנים", en: "Use polls and questions – UGC influences 79% of consumer purchase decisions" },
          ],
        });
      }
    }
    if (existingChannels.includes("email") || isB2B) {
      channels.push({
        channel: "email",
        name: { he: "ניוזלטר מומחיות", en: "Expertise Newsletter" },
        budgetPercent: 25,
        kpis: [
          { he: "שיעור פתיחה", en: "Open rate" },
          { he: "שיעור הקלקה", en: "Click rate" },
        ],
        tips: [
          { he: "שלח ניוזלטר שבועי עם תובנות ייחודיות – תן ערך לפני שאתה מבקש משהו (עיקרון ההדדיות)", en: "Send a weekly newsletter with unique insights – give value before asking for anything (Reciprocity principle)" },
        ],
      });
    }
  }

  // ═══════════════════════════════════════════════
  // STAGE: LEADS — Diagnostic Lead Magnet (Δ-Navigator Pillar 3)
  // ═══════════════════════════════════════════════
  if (stageName === "leads") {
    if (isB2B) {
      // Diagnostic Assessment — core Δ-Navigator channel
      channels.push({
        channel: "content",
        name: { he: "אבחון דיאגנוסטי / וובינר", en: "Diagnostic Assessment / Webinar" },
        budgetPercent: 35,
        kpis: [
          { he: "הרשמות לאבחון", en: "Assessment sign-ups" },
          { he: "שיעור השלמה", en: "Completion rate" },
        ],
        tips: [
          { he: "צור כלי אבחון שחושף פער (דיסוננס קוגניטיבי) בין המצב הנוכחי לפוטנציאל – זה מניע פעולה", en: "Create a diagnostic tool exposing the gap (cognitive dissonance) between current state and potential – this drives action" },
          { he: "הצע 'בדיקת בריאות' חינמית לעסק הלקוח – כלי Self-Assessment ממירים פי 2-3 מ-PDF רגיל", en: "Offer a free 'health check' for the prospect's business – Self-Assessment tools convert 2-3x more than regular PDFs" },
        ],
      });
      channels.push({
        channel: "linkedIn",
        name: { he: "LinkedIn Lead Gen", en: "LinkedIn Lead Gen" },
        budgetPercent: 30,
        kpis: [
          { he: "עלות ללקוח פוטנציאלי", en: "Cost per lead" },
          { he: "שיעור המרת טפסים", en: "Form conversion rate" },
        ],
        tips: [
          { he: "הפנה ל-Diagnostic Assessment ולא ל-PDF – כלי אינטראקטיבי בונה אמון טוב יותר", en: "Direct to Diagnostic Assessment not PDF – interactive tools build better trust" },
        ],
      });
    }
    channels.push({
      channel: "google",
      name: { he: "גוגל Ads (חיפוש)", en: "Google Ads (Search)" },
      budgetPercent: isHighPrice ? 35 : 25,
      kpis: [
        { he: "עלות ללקוח פוטנציאלי", en: "Cost per lead (CPL)" },
        { he: "מספר לידים", en: "Number of leads" },
      ],
      tips: [
        { he: "בנה דף נחיתה ממוקד – עיצוב Frictionless מעלה המרות ב-35%", en: "Build a focused landing page – Frictionless design increases conversions by 35%" },
      ],
    });
    if (isB2C && !isLowBudget) {
      channels.push({
        channel: "facebook",
        name: { he: "טפסי לידים בפייסבוק", en: "Facebook Lead Forms" },
        budgetPercent: 30,
        kpis: [
          { he: "עלות ללקוח פוטנציאלי", en: "Cost per lead" },
          { he: "איכות לידים", en: "Lead quality" },
        ],
        tips: [
          { he: "הצע הטבה בתמורה לפרטים – עיקרון ההדדיות: תן ערך לפני שאתה מבקש", en: "Offer a benefit in exchange for details – Reciprocity principle: give value before asking" },
        ],
      });
    }
    if (!isB2B) {
      channels.push({
        channel: "content",
        name: { he: "תוכן מגנטי (Lead Magnet)", en: "Lead Magnet Content" },
        budgetPercent: 25,
        kpis: [
          { he: "הורדות", en: "Downloads" },
          { he: "הרשמות", en: "Sign-ups" },
        ],
        tips: [
          { he: "צור מדריך PDF או רשימת בדיקה – תוכן שיווקי מייצר פי 3 יותר לידים ב-62% פחות עלות", en: "Create a PDF guide or checklist – content marketing generates 3x more leads at 62% less cost" },
        ],
      });
    }
  }

  // ═══════════════════════════════════════════════
  // STAGE: CONVERSION — Tripwire & PLG (Δ-Navigator Pillar 4)
  // ═══════════════════════════════════════════════
  if (stageName === "conversion") {
    if (isB2B) {
      // Tripwire Offer — Δ-Navigator core
      channels.push({
        channel: "content",
        name: { he: "Tripwire – ספרינט/סדנה", en: "Tripwire Offer (Sprint/Workshop)" },
        budgetPercent: 35,
        kpis: [
          { he: "שיעור המרה מ-Tripwire לעסקה מלאה", en: "Tripwire-to-full-deal conversion rate" },
          { he: "זמן מ-Tripwire לסגירה", en: "Time from Tripwire to close" },
        ],
        tips: [
          { he: "הצע ספרינט אסטרטגי (₪299-₪999) שפותר בעיה קטנה וחושף את הערך המלא – PLG בפעולה", en: "Offer a strategic sprint ($299-$999) solving a small problem and revealing full value – PLG in action" },
          { he: "מודל Freemium ממיר 6-15% למשלמים – הראה ערך לפני שאתה מבקש תשלום מלא", en: "Freemium model converts 6-15% to paying – show value before asking for full payment" },
        ],
      });
      channels.push({
        channel: "content",
        name: { he: "Case Studies ודמואים", en: "Case Studies & Demos" },
        budgetPercent: 30,
        kpis: [
          { he: "בקשות לדמו", en: "Demo requests" },
          { he: "יחס סגירה", en: "Close rate" },
        ],
        tips: [
          { he: "הכן סיפורי הצלחה כ'ROI Epics' – כמת את הטרנספורמציה: 'מ-X ל-Y תוך Z חודשים'", en: "Prepare success stories as 'ROI Epics' – quantify the transformation: 'from X to Y in Z months'" },
        ],
      });
    }
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
          { he: "רימרקטינג למבקרים שלא השלימו רכישה – הפחת עומס קוגניטיבי בתהליך הרכישה (Cognitive Load Theory)", en: "Remarketing for visitors who didn't complete purchase – reduce cognitive load in checkout (Cognitive Load Theory)" },
        ],
      });
    }
    channels.push({
      channel: "email",
      name: { he: "אוטומציית אימייל", en: "Email Automation" },
      budgetPercent: 25,
      kpis: [
        { he: "שיעור המרה מאימייל", en: "Email conversion rate" },
        { he: "הכנסה לאימייל", en: "Revenue per email" },
      ],
      tips: [
        { he: "בנה סדרת מיילים אוטומטית – עקרון ההדדיות: כל מייל נותן ערך לפני הבקשה", en: "Build an automated drip series – Reciprocity principle: every email gives value before asking" },
        isHighPrice || isB2B
          ? { he: "הוסף שיחת ייעוץ מכירות ייעוצית (Consultative Selling) לפני סגירה", en: "Add a consultative selling call before closing" }
          : { he: "הצע קופון הנחה למתלבטים – הפחת חיכוך (Frictionless Experience)", en: "Offer a discount coupon for undecided prospects – reduce friction (Frictionless Experience)" },
      ],
    });
  }

  // ═══════════════════════════════════════════════
  // STAGE: RETENTION — Consultative Closing & Advocacy
  // ═══════════════════════════════════════════════
  if (stageName === "retention") {
    channels.push({
      channel: "email",
      name: { he: "שיווק באימייל לשימור", en: "Retention Email Marketing" },
      budgetPercent: 30,
      kpis: [
        { he: "שיעור שימור לקוחות", en: "Customer retention rate" },
        { he: "ערך חיי לקוח (LTV)", en: "Customer lifetime value (LTV)" },
      ],
      tips: [
        { he: "שלח הצעות מותאמות אישית – 76% מהלקוחות מתוסכלים מחוויה לא מותאמת", en: "Send personalized offers – 76% of customers are frustrated by non-personalized experiences" },
      ],
    });
    // Community as Moat — CLG channel
    channels.push({
      channel: "content",
      name: { he: "פלטפורמת קהילה (CLG)", en: "Community Platform (CLG)" },
      budgetPercent: 30,
      kpis: [
        { he: "מעורבות בקהילה", en: "Community engagement" },
        { he: "הפניות (Referrals)", en: "Referrals" },
        { he: "NPS", en: "NPS" },
      ],
      tips: [
        { he: "קהילה כתעלה: CLG מניב עלות רכישה נמוכה פי 5, LTV גבוה פי 3 ושימור גבוה ב-90% (Figma, Notion)", en: "Community as Moat: CLG delivers 5x lower CAC, 3x higher LTV, 90% higher retention (Figma, Notion)" },
        { he: "הפוך לקוחות מרוצים לשגרירי מותג – בנה פלטפורמה לשיתוף סיפורי הצלחה", en: "Turn happy customers into brand advocates – build a platform for sharing success stories" },
      ],
    });
    if (data.salesModel === "subscription") {
      channels.push({
        channel: "content",
        name: { he: "תוכן בלעדי למנויים", en: "Exclusive Subscriber Content" },
        budgetPercent: 20,
        kpis: [
          { he: "שיעור חידוש מנויים", en: "Subscription renewal rate" },
          { he: "Freemium-to-Paid Rate", en: "Freemium-to-Paid Rate" },
        ],
        tips: [
          { he: "מודל Freemium ממיר 6-15% למשלמים – ודא שהערך הבלעדי ברור ומשמעותי", en: "Freemium model converts 6-15% to paying – ensure exclusive value is clear and meaningful" },
        ],
      });
    }
    if (!data.salesModel || data.salesModel !== "subscription") {
      channels.push({
        channel: "facebook",
        name: { he: "קהילת לקוחות VIP", en: "VIP Customer Community" },
        budgetPercent: 20,
        kpis: [
          { he: "המלצות", en: "Referrals" },
          { he: "רכישות חוזרות", en: "Repeat purchases" },
        ],
        tips: [
          { he: "הקם קבוצת VIP ללקוחות נאמנים – קהילה מחזקת נאמנות ב-90%", en: "Create a VIP group for loyal customers – community boosts retention by 90%" },
        ],
      });
    }
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

  // ═══════════════════════════════════════════════
  // Attention Economy Context (all users)
  // ═══════════════════════════════════════════════
  tips.push({
    he: "🧠 כלכלת הקשב: הקהל שלך חשוף ל-4,000-10,000 מודעות ביום. המשפך שלך חייב לחתוך דרך העומס הקוגניטיבי – מסרים ברורים, חוויה חלקה, ערך מיידי",
    en: "🧠 Attention Economy: Your audience sees 4,000-10,000 ads daily. Your funnel must cut through cognitive overload – clear messages, frictionless experience, immediate value",
  });

  // ═══════════════════════════════════════════════
  // META-PRINCIPLE 1: Trust as Currency (Prometheus V2.0)
  // ═══════════════════════════════════════════════
  tips.push({
    he: "🛡️ אמון כמטבע: UGC משפיע על 79% מהחלטות הרכישה. מיקרו-משפיענים מניבים ROI של $5.78 לכל $1. פער האמון (Edelman) הוא ההזדמנות שלך – היה אותנטי",
    en: "🛡️ Trust as Currency: UGC influences 79% of purchase decisions. Micro-influencers yield $5.78 ROI per $1. The Edelman trust gap is your opportunity – be authentic",
  });

  // ═══════════════════════════════════════════════
  // B2B Δ-Navigator Framework
  // ═══════════════════════════════════════════════
  if (audienceType === "b2b" || audienceType === "both") {
    tips.push({
      he: "🔺 Δ-Navigator B2B: 5 עמודים – (1) ICP & UVP (2) Thought Leadership (3) Lead Magnet דיאגנוסטי (4) Tripwire & PLG (5) סגירה ייעוצית. בנה את המשפך סביב העמודים האלו",
      en: "🔺 Δ-Navigator B2B: 5 Pillars – (1) ICP & UVP (2) Thought Leadership (3) Diagnostic Lead Magnet (4) Tripwire & PLG (5) Consultative Closing. Build your funnel around these pillars",
    });
    tips.push({
      he: "🔬 דיסוננס קוגניטיבי: צור כלי אבחון שחושף פער בין המצב הנוכחי לפוטנציאל – זה מנוע ההמרה החזק ביותר ב-B2B",
      en: "🔬 Cognitive Dissonance: Create a diagnostic tool exposing the gap between current state and potential – this is the most powerful B2B conversion driver",
    });
    if (averagePrice > 1000) {
      tips.push({
        he: "💎 B2B High-Ticket: הצע Tripwire (ספרינט ₪299-₪999) לפני העסקה המלאה. Freemium ממיר 6-15%. השקע 68% ברכישה ו-32% בשימור",
        en: "💎 B2B High-Ticket: Offer a Tripwire (sprint $299-$999) before the full deal. Freemium converts 6-15%. Invest 68% in acquisition and 32% in retention",
      });
    }
    tips.push({
      he: "📊 Pipeline KPIs: מעבר ל-CPC – מדוד Pipeline Velocity, Coverage Ratio, Trust Score (NPS), Churn Rate ו-LTV",
      en: "📊 Pipeline KPIs: Beyond CPC – measure Pipeline Velocity, Coverage Ratio, Trust Score (NPS), Churn Rate, and LTV",
    });
  }

  // ═══════════════════════════════════════════════
  // META-PRINCIPLE 2: Reciprocity / Value-First
  // ═══════════════════════════════════════════════
  if (budgetRange === "low" || experienceLevel === "beginner") {
    tips.push({
      he: "🎁 עיקרון ההדדיות: תוכן שיווקי מייצר פי 3 יותר לידים ב-62% פחות עלות – תן ערך חינם לפני שאתה מבקש משהו",
      en: "🎁 Reciprocity Principle: Content marketing generates 3x more leads at 62% less cost – give free value before asking for anything",
    });
  }

  // ═══════════════════════════════════════════════
  // META-PRINCIPLE 3: Radical Relevance (Personalization)
  // ═══════════════════════════════════════════════
  if (mainGoal === "sales" || mainGoal === "leads") {
    tips.push({
      he: "🎯 רלוונטיות רדיקלית: 71% מהצרכנים מצפים להתאמה אישית, 76% מתוסכלים בלעדיה. פרסונליזציה מעלה הכנסות ב-5-15%",
      en: "🎯 Radical Relevance: 71% of consumers expect personalization, 76% are frustrated without it. Personalization lifts revenue by 5-15%",
    });
  }

  // ═══════════════════════════════════════════════
  // META-PRINCIPLE 4: Frictionless Experience
  // ═══════════════════════════════════════════════
  if (mainGoal === "sales") {
    tips.push({
      he: "⚡ חוויה חלקה: עיצוב מחדש של תהליך הרכישה מעלה המרות ב-35%. הפחת עומס קוגניטיבי (Cognitive Load Theory של Sweller) בכל שלב",
      en: "⚡ Frictionless Experience: Checkout redesign increases conversions by 35%. Reduce cognitive load (Sweller's Cognitive Load Theory) at every stage",
    });
  }

  // ═══════════════════════════════════════════════
  // META-PRINCIPLE 5: Community as Moat (CLG)
  // ═══════════════════════════════════════════════
  if (mainGoal === "loyalty" || salesModel === "subscription") {
    tips.push({
      he: "🏰 קהילה כתעלה (CLG): עלות רכישה נמוכה פי 5, LTV גבוה פי 3, שימור גבוה ב-90% (Figma, Notion). בנה קהילה סביב המוצר",
      en: "🏰 Community as Moat (CLG): 5x lower CAC, 3x higher LTV, 90% higher retention (Figma, Notion). Build a community around your product",
    });
  }

  // ═══════════════════════════════════════════════
  // Contextual Tips
  // ═══════════════════════════════════════════════
  if (experienceLevel === "beginner") {
    tips.push({
      he: "💡 התחל עם ערוץ אחד או שניים – מודל היברידי (צוות פנימי + סוכנות) יכול להאיץ תוצאות",
      en: "💡 Start with one or two channels – a hybrid model (in-house + agency) can accelerate results",
    });
  }

  if (audienceType === "b2c" && ageRange[0] < 30) {
    tips.push({
      he: "🎯 קהל צעיר: טיקטוק ופינטרסט – אותנטיות גוברת על ערכי הפקה בכלכלת הקשב",
      en: "🎯 Young audience: TikTok and Pinterest – authenticity beats production values in the attention economy",
    });
  }

  if (!existingChannels.includes("email")) {
    tips.push({
      he: "📧 אימייל הוא הערוץ עם ה-ROI הגבוה ביותר – בנה רשימת תפוצה עכשיו",
      en: "📧 Email has the highest ROI of any channel – start building your mailing list now",
    });
  }

  if (businessField === "fashion" || businessField === "food") {
    tips.push({
      he: "📸 בתחום שלך, UGC ותוכן ויזואלי אותנטי מניבים ביצועים טובים ב-93% מהמקרים לעומת תוכן ממותג",
      en: "📸 In your field, UGC and authentic visual content outperform branded content in 93% of cases",
    });
  }

  return tips.slice(0, 10);
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

  // B2B Framework KPIs (Δ-Navigator + Prometheus)
  if (data.audienceType === "b2b") {
    kpis.push({
      name: { he: "Pipeline Velocity", en: "Pipeline Velocity" },
      target: data.averagePrice > 1000 ? "₪50K-200K/month" : "₪10K-50K/month",
    });
    kpis.push({
      name: { he: "Coverage Ratio (Pipeline/Target)", en: "Coverage Ratio (Pipeline/Target)" },
      target: "3x-5x",
    });
    kpis.push({
      name: { he: "Trust Score (NPS)", en: "Trust Score (NPS)" },
      target: "40-70+",
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
    kpis.push({
      name: { he: "מעורבות בקהילה (CLG)", en: "Community Engagement (CLG)" },
      target: "15-30% MAU",
    });
  }

  // PLG / Freemium KPI
  if (data.salesModel === "subscription" || (data.audienceType === "b2b" && data.averagePrice > 500)) {
    kpis.push({
      name: { he: "Freemium-to-Paid Rate", en: "Freemium-to-Paid Rate" },
      target: "6-15%",
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

  const isB2B = data.audienceType === "b2b" || data.audienceType === "both";
  
  const stageDefinitions = isB2B ? [
    { id: "awareness", name: { he: "ICP טרגוט וגילוי כאב", en: "ICP Targeting & Pain Discovery" }, desc: { he: "זיהוי ה-ICP (Ideal Customer Profile), מיפוי הכאב העסקי, ויצירת מודעות לפער בין המצב הנוכחי לפוטנציאל", en: "Identify your ICP (Ideal Customer Profile), map their business pain, and create awareness of the gap between current state and potential" } },
    { id: "engagement", name: { he: "Thought Leadership ותעלת אמון", en: "Thought Leadership & Trust Moat" }, desc: { he: "מיצוב המותג כסמכות בתעשייה: דוחות, תובנות מקוריות, Case Studies כ'אפוסים של הצלחה' – בניית תעלת אמון בלתי עבירה", en: "Position your brand as an industry authority: reports, original insights, Case Studies as 'Success Epics' – building an impenetrable Trust Moat" } },
    { id: "leads", name: { he: "Lead Magnet דיאגנוסטי", en: "Diagnostic Lead Magnet" }, desc: { he: "יצירת דיסוננס קוגניטיבי באמצעות כלי אבחון שחושף פער בין המצב הנוכחי לפוטנציאל – מנוע ההמרה החזק ביותר", en: "Create cognitive dissonance with a diagnostic tool exposing the gap between current state and potential – the most powerful conversion driver" } },
    { id: "conversion", name: { he: "Tripwire & PLG", en: "Tripwire & PLG" }, desc: { he: "הורדת מחסום הכניסה עם Tripwire (ספרינט/סדנה), מודל PLG/Freemium, וסגירה ייעוצית (Consultative Selling)", en: "Lower the entry barrier with a Tripwire (sprint/workshop), PLG/Freemium model, and consultative selling" } },
    { id: "retention", name: { he: "סגירה ייעוצית ושגרירות", en: "Consultative Closing & Advocacy" }, desc: { he: "סגירה ייעוצית, הפיכת לקוחות לשגרירי מותג, ובניית קהילה כתעלה (CLG) – עלות רכישה נמוכה פי 5", en: "Consultative closing, turning customers into brand advocates, and building Community as Moat (CLG) – 5x lower CAC" } },
  ] : [
    { id: "awareness", name: { he: "מודעות", en: "Awareness" }, desc: { he: "הגברת הנראות בכלכלת הקשב – חיתוך דרך 4,000-10,000 מודעות שהקהל שלך רואה ביום", en: "Increasing visibility in the attention economy – cutting through 4,000-10,000 ads your audience sees daily" } },
    { id: "engagement", name: { he: "מעורבות ואמון", en: "Engagement & Trust" }, desc: { he: "בניית אמון ואינטראקציה – UGC, אותנטיות ומיקרו-משפיענים מניבים ביצועים טובים ב-93%", en: "Building trust and interaction – UGC, authenticity and micro-influencers outperform by 93%" } },
    { id: "leads", name: { he: "לידים", en: "Leads" }, desc: { he: "איסוף פרטי לקוחות פוטנציאליים באמצעות עיקרון ההדדיות – ערך לפני בקשה", en: "Collecting potential customer details using the Reciprocity principle – value before asking" } },
    { id: "conversion", name: { he: "המרה", en: "Conversion" }, desc: { he: "הפיכת מתעניינים ללקוחות – חוויה חלקה (Frictionless) מעלה המרות ב-35%", en: "Converting prospects into customers – Frictionless experience increases conversions by 35%" } },
    { id: "retention", name: { he: "שימור וקהילה", en: "Retention & Community" }, desc: { he: "שימור באמצעות קהילה (CLG): עלות רכישה נמוכה פי 5, LTV גבוה פי 3, שימור גבוה ב-90%", en: "Retention through Community (CLG): 5x lower CAC, 3x higher LTV, 90% higher retention" } },
  ];

  const stages: FunnelStage[] = stageDefinitions.map((stage) => ({
    id: stage.id,
    name: stage.name,
    budgetPercent: weights[stage.id] || 0,
    channels: getChannelsForStage(stage.id, data),
    description: stage.desc,
  }));

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
