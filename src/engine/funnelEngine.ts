import { FormData, FunnelResult, FunnelStage, ChannelRecommendation, HookTip, CopyLabData, CopyFormula, ReaderProfile, WritingTechnique, PersonalBrandData, NeuroStorytellingData, NeuroVector, NeuroPromptTemplate, EntropyGuide } from "@/types/funnel";

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
    personalBrand: { he: "מיתוג אישי", en: "Personal Brand" },
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

  // ═══════════════════════════════════════════════
  // Personal Brand Tips
  // ═══════════════════════════════════════════════
  if (businessField === "personalBrand") {
    tips.push({
      he: "🎯 משולש הזהב: מצא את הצומת בין מומחיות × עניין × ביקוש – שם נמצאת הנישה המושלמת שלך",
      en: "🎯 Golden Triangle: Find the intersection of expertise × interest × demand – that's where your perfect niche lives",
    });
    tips.push({
      he: "🌊 אוקיינוס כחול: במקום להתחרות בשוק רווי, השתמש במטריצת ERRC (בטל, הפחת, העלה, צור) כדי ליצור קטגוריה חדשה",
      en: "🌊 Blue Ocean: Instead of competing in a saturated market, use the ERRC Matrix (Eliminate, Reduce, Raise, Create) to create a new category",
    });
    tips.push({
      he: "📡 סיגנלים יקרים (Costly Signals): תוצאות מתועדות, Case Studies עם מספרים, והמלצות וידאו – אלה הסיגנלים שבאמת משכנעים",
      en: "📡 Costly Signals: Documented results, Case Studies with numbers, and video testimonials – these are the signals that truly convince",
    });
    tips.push({
      he: "✨ אפקט ההילה: זהה את ה-Mega Trait שלך (תכונה מרכזית אחת) ובנה סביבו את כל הנרטיב – הוא ישפיע על תפיסת כל שאר התכונות",
      en: "✨ Halo Effect: Identify your Mega Trait (one core quality) and build your entire narrative around it – it influences perception of all other qualities",
    });
    if (audienceType === "b2b") {
      tips.push({
        he: "🤝 שנאת הפסד במיתוג: מסגר את הערך שלך דרך 'עלות האי-פעולה' – כמה עולה ללקוח לא להשתמש בך? זה חזק פי 2 מהבטחת רווח",
        en: "🤝 Loss Aversion in Branding: Frame your value through 'cost of inaction' – how much does it cost NOT to use you? This is 2x stronger than promising gains",
      });
    }
    tips.push({
      he: "🔗 דביקות רשת: בנה קהילה שהערך שלה גדל עם כל חבר חדש – Alumni Network, אירועים, Referrals דו-כיווניים",
      en: "🔗 Network Stickiness: Build a community whose value grows with each new member – Alumni Network, events, bilateral Referrals",
    });
  }

  return tips.slice(0, 12);
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

function getHookTips(data: FormData): HookTip[] {
  const hooks: HookTip[] = [];
  const { audienceType, experienceLevel, existingChannels, ageRange } = data;
  const isB2B = audienceType === "b2b" || audienceType === "both";
  const isB2C = audienceType === "b2c" || audienceType === "both";
  const isAdvanced = experienceLevel === "advanced";
  const isYoung = ageRange[0] < 30;

  // Law 1: Epistemic Curiosity Gap — best for B2B, LinkedIn, Email
  if (isB2B || isAdvanced) {
    hooks.push({
      law: "curiosityGap",
      lawName: { he: "פער סקרנות אפיסטמי", en: "Epistemic Curiosity Gap" },
      formula: { he: "\"[מספר ספציפי] [תוצאה] – וזה לא מה שאתה חושב\" | \"הסיבה האמיתית ש-[X] נכשל ב-[Y]\"", en: "\"[Specific number] [outcome] – and it's not what you think\" | \"The real reason [X] fails at [Y]\"" },
      example: { he: "\"73% מהמנהלים עושים את השגיאה הזו בפיפליין – וזה לא מה שאתה חושב\"", en: "\"73% of executives make this pipeline mistake – and it's not what you think\"" },
      channels: ["LinkedIn", "Email", "Blog"],
    });
  }

  // Law 2: Asymmetric Loss Pricing — best for B2C, Email, Ads
  if (isB2C) {
    hooks.push({
      law: "lossAversion",
      lawName: { he: "תמחור הפסד אסימטרי", en: "Asymmetric Loss Pricing" },
      formula: { he: "\"אתה מפסיד [X] בכל [יחידת זמן] ש-[Y]\" | \"כל יום בלי [Z] עולה לך [סכום]\"", en: "\"You're losing [X] every [time unit] that [Y]\" | \"Every day without [Z] costs you [amount]\"" },
      example: { he: "\"כל חודש בלי אוטומציה עולה לך ₪4,200 – הפסד שקט שהמתחרים כבר עצרו\"", en: "\"Every month without automation costs you $4,200 – a silent loss your competitors already stopped\"" },
      channels: ["Email", "Facebook Ads", "Google Ads"],
    });
  }

  // Law 3: Anchoring & Absolute Specificity — universal
  hooks.push({
    law: "anchoring",
    lawName: { he: "עיגון ומדויקות מוחלטת", en: "Anchoring & Absolute Specificity" },
    formula: { he: "השתמש במספרים היפר-ספציפיים (47.3% ולא \"כמחצית\") – מספרים מדויקים עוקפים ספקנות", en: "Use hyper-specific numbers (47.3% not \"about half\") – precise numbers bypass skepticism" },
    example: { he: "\"שיפור של 23.7% בהמרות תוך 14 ימים\" במקום \"שיפור משמעותי בהמרות\"", en: "\"23.7% conversion improvement in 14 days\" instead of \"significant conversion improvement\"" },
    channels: ["Google Ads", "Email", "Landing Pages"],
  });

  // Law 4: Pattern Interrupt — best for TikTok, Reels, young audiences
  if (isB2C || isYoung) {
    hooks.push({
      law: "patternInterrupt",
      lawName: { he: "שבירת דפוס", en: "Pattern Interrupt" },
      formula: { he: "\"תפסיק לעשות [דבר מקובל]\" | \"מה אם אמרתי לך ש-[ההפך מהצפוי]?\" | פתח עם משפט שלא הגיוני לכאורה", en: "\"Stop doing [common thing]\" | \"What if I told you [opposite of expected]?\" | Open with a seemingly illogical statement" },
      example: { he: "\"הקמפיין הכי מוצלח שלי עלה 0 שקל\" | \"התוכן הכי טוב שלך? תמחק אותו.\"", en: "\"My most successful campaign cost $0\" | \"Your best content? Delete it.\"" },
      channels: ["TikTok", "Instagram Reels", "LinkedIn"],
    });
  }

  // Law 5: Social Identity Boundary Drawing — B2B and community
  if (isB2B) {
    hooks.push({
      law: "identityBoundary",
      lawName: { he: "שרטוט גבולות זהות חברתית", en: "Social Identity Boundary Drawing" },
      formula: { he: "\"יש 2 סוגי [X]: אלה ש-[A] ואלה ש-[B]\" | \"אם אתה [זהות שלילית], תמשיך לגלול\"", en: "\"There are 2 types of [X]: those who [A] and those who [B]\" | \"If you're [negative identity], keep scrolling\"" },
      example: { he: "\"יש 2 סוגי CMOs: אלה שמודדים Pipeline Velocity ואלה שעדיין מדווחים CPL\"", en: "\"There are 2 types of CMOs: those measuring Pipeline Velocity and those still reporting CPL\"" },
      channels: ["LinkedIn", "Email", "Webinar"],
    });
  }

  // Law 6: SPOK Violation & Semantic Tension — advanced users
  if (isAdvanced) {
    hooks.push({
      law: "semanticTension",
      lawName: { he: "הפרת SPOK ומתח סמנטי", en: "SPOK Violation & Semantic Tension" },
      formula: { he: "שלב מילים סותרות: \"[שלילי] + [חיובי]\" | \"[טכני] + [רגשי]\" – הפרדוקס עוצר קריאה אוטומטית", en: "Combine contradictory words: \"[negative] + [positive]\" | \"[technical] + [emotional]\" – paradox halts automatic reading" },
      example: { he: "\"הכישלון המבריק\" | \"האסטרטגיה העצלה שמכפילה מכירות\" | \"המדריך האנטי-שיווקי לשיווק\"", en: "\"The brilliant failure\" | \"The lazy strategy that doubles sales\" | \"The anti-marketing guide to marketing\"" },
      channels: ["Blog", "LinkedIn", "Email Subject Lines"],
    });
  }

  // Law 7: Peak-End Rule in Micro-Copy — social media
  if (isB2C || existingChannels.includes("instagram") || existingChannels.includes("tikTok")) {
    hooks.push({
      law: "peakEnd",
      lawName: { he: "כלל שיא-סוף במיקרו-קופי", en: "Peak-End Rule in Micro-Copy" },
      formula: { he: "מקם את השיא הרגשי בדיוק בנקודת ה'ראה עוד' – שורה 2-3 חייבת להיות הפיק. אל תשמור את הטוב לסוף", en: "Place the emotional peak exactly at the 'see more' cut point – line 2-3 must be the peak. Don't save the best for last" },
      example: { he: "שורה 1: הקשר | שורה 2-3: 💥 הטוויסט/הנתון המפתיע (כאן לוחצים 'ראה עוד') | שורה 4+: הפירוט", en: "Line 1: Context | Line 2-3: 💥 The twist/surprising stat (here they click 'see more') | Line 4+: Details" },
      channels: ["Instagram", "Facebook", "LinkedIn"],
    });
  }

  // Law 8: Time Compression Illusion — B2C, ads
  if (isB2C) {
    hooks.push({
      law: "timeCompression",
      lawName: { he: "אשליית דחיסת זמן", en: "Time Compression Illusion" },
      formula: { he: "\"[תוצאה גדולה] ב-[זמן קטן מהצפוי]\" | \"בלי [מאמץ שהקהל מפחד ממנו]\"", en: "\"[Big result] in [less time than expected]\" | \"Without [effort the audience fears]\"" },
      example: { he: "\"3 דקות ביום → עור שנראה 5 שנים צעיר יותר\" | \"בלי להעסיק צוות, בלי תקציב ענק\"", en: "\"3 minutes a day → skin that looks 5 years younger\" | \"No hiring, no huge budget\"" },
      channels: ["Facebook Ads", "Instagram", "Google Ads"],
    });
  }

  // Law 9: Weaponized Vulnerability / POV Framing — B2B, LinkedIn
  if (isB2B || isAdvanced) {
    hooks.push({
      law: "vulnerability",
      lawName: { he: "פגיעות מכוונת / POV Framing", en: "Weaponized Vulnerability / POV Framing" },
      formula: { he: "\"הייתי טועה לגבי [X]. הנה מה שלמדתי\" | \"הכישלון שלימד אותי [תובנה]\" – חולשה אותנטית = סוס טרויאני של אמון", en: "\"I was wrong about [X]. Here's what I learned\" | \"The failure that taught me [insight]\" – authentic weakness = trust Trojan horse" },
      example: { he: "\"בזבזתי ₪120K על קמפיינים שלא עבדו. הנה 3 הלקחים שהפכו הכל\"", en: "\"I wasted $120K on campaigns that didn't work. Here are the 3 lessons that changed everything\"" },
      channels: ["LinkedIn", "Blog", "Podcast"],
    });
  }

  // Law 10: Execution Gap Architecture — universal
  hooks.push({
    law: "executionGap",
    lawName: { he: "ארכיטקטורת פער הביצוע", en: "Execution Gap Architecture" },
    formula: { he: "\"הבעיה היא לא שאתה לא יודע מה לעשות – הבעיה היא [חיכוך ספציפי]\" → מצב את התוכן כמערכת שמסירה חיכוך", en: "\"The problem isn't that you don't know what to do – the problem is [specific friction]\" → position content as a friction-removing system" },
    example: { he: "\"אתה לא צריך עוד מידע על שיווק. אתה צריך מערכת שעושה את הצעד הבא בשבילך\"", en: "\"You don't need more marketing information. You need a system that takes the next step for you\"" },
    channels: ["Landing Pages", "Email", "Webinar"],
  });

  // Limit based on experience level
  const limit = experienceLevel === "beginner" ? 3 : experienceLevel === "intermediate" ? 5 : hooks.length;
  return hooks.slice(0, limit);
}

function getCopyLabData(data: FormData): CopyLabData {
  const { audienceType, experienceLevel, mainGoal, existingChannels, ageRange } = data;
  const isB2B = audienceType === "b2b" || audienceType === "both";
  const isB2C = audienceType === "b2c" || audienceType === "both";
  const isBeginner = experienceLevel === "beginner";
  const isAdvanced = experienceLevel === "advanced";

  // ═══════════════════════════════════════════════
  // READER PROFILE (Meta-Cognitive Framework)
  // ═══════════════════════════════════════════════
  let readerProfile: ReaderProfile;

  if (isB2C && ageRange[0] < 30) {
    // Young B2C → System 1 dominant
    readerProfile = {
      level: 1,
      name: { he: "קורא רגשי (System 1)", en: "Emotional Reader (System 1)" },
      description: { he: "מקבל החלטות דרך רגש, אינטואיציה והוכחה חברתית. מחליט תוך פחות מ-30 שניות. לא קורא מעבר לכותרת אם היא לא תופסת", en: "Makes decisions through emotion, intuition, and social proof. Decides in under 30 seconds. Won't read past the headline if it doesn't grab" },
      copyArchitecture: { he: "כותרת: [מילה בעוצמה גבוהה] + [הוכחה חברתית] + [מחסור]\nפסקה ראשונה: [סיפור/רגש] + [FOMO]\nCTA: [דחיפות] + [ללא חיכוך]", en: "Headline: [High-arousal word] + [Social proof] + [Scarcity]\nFirst paragraph: [Story/emotion] + [FOMO]\nCTA: [Urgency] + [Friction-free]" },
      principles: [
        { he: "✓ מחסור ודחיפות (השפעה +40-50%)", en: "✓ Scarcity & Urgency (+40-50% impact)" },
        { he: "✓ הוכחה חברתית (השפעה +35-40%)", en: "✓ Social Proof (+35-40% impact)" },
        { he: "✓ סיפור רגשי (השפעה +45-60%)", en: "✓ Emotional storytelling (+45-60% impact)" },
        { he: "✗ נתונים וסמכות (השפעה נמוכה)", en: "✗ Authority data (LOW impact)" },
      ],
    };
  } else if (isB2B && (isAdvanced || data.averagePrice > 1000)) {
    // B2B analytical → System 2 dominant
    readerProfile = {
      level: 3,
      name: { he: "קורא אנליטי (System 2)", en: "Analytical Reader (System 2)" },
      description: { he: "מקבל החלטות דרך לוגיקה, נתונים וספקנות. חוקר בהרחבה. קורא הכל. דורש הוכחות, מקורות ומגבלות. זמן החלטה: 10-30+ דקות", en: "Makes decisions through logic, data, and skepticism. Researches extensively. Reads everything. Demands proof, sources, and limitations. Decision time: 10-30+ minutes" },
      copyArchitecture: { he: "כותרת: [טענה ספציפית] + [מגדיר היקף]\nפסקה 1: [הצהרת בעיה] + [למה זה חשוב]\nפסקה 2: [מתודולוגיה/נתונים]\nפסקה 3: [מגבלות בשקיפות]\nCTA: [פעולה ספציפית] + [נסה לפני שאתה קונה]", en: "Headline: [Specific claim] + [Scope qualifier]\nParagraph 1: [Problem statement] + [Why it matters]\nParagraph 2: [Methodology/data]\nParagraph 3: [Transparent limitations]\nCTA: [Specific action] + [Try before buying]" },
      principles: [
        { he: "✓ סמכות + מקורות (השפעה +40%)", en: "✓ Authority + Credentials (+40% impact)" },
        { he: "✓ נתונים ספציפיים + ציטוטים (השפעה +42%)", en: "✓ Specific data + Citations (+42% impact)" },
        { he: "✓ שקיפות על מגבלות (השפעה +35%)", en: "✓ Transparency about limitations (+35% impact)" },
        { he: "✗ מחסור לבד (BACKFIRE -20%)", en: "✗ Scarcity alone (BACKFIRES -20%)" },
        { he: "✗ סיפור רגשי בלבד (השפעה נמוכה)", en: "✗ Emotional storytelling alone (LOW impact)" },
      ],
    };
  } else {
    // Default: Balanced reader (System 1 + 2)
    readerProfile = {
      level: 2,
      name: { he: "קורא מאוזן (System 1 + 2)", en: "Balanced Reader (System 1 + 2)" },
      description: { he: "מקבל החלטות דרך שילוב רגש ולוגיקה (רוב האנשים). מגיב לסיפורים עם נתונים. זמן החלטה: 2-5 דקות", en: "Makes decisions through both emotion and logic (most people). Responds to stories WITH data. Decision time: 2-5 minutes" },
      copyArchitecture: { he: "כותרת: [תועלת] + [הוכחה חברתית] + [ספציפיות]\nפסקה 1: [סיפור]\nפסקה 2: [נתונים]\nפסקה 3: [הוכחה חברתית] + [ביטחון]\nCTA: [פועל פעולה] + [התחייבות קטנה] + [מחסור]", en: "Headline: [Benefit] + [Social proof] + [Specificity]\nParagraph 1: [Story]\nParagraph 2: [Data]\nParagraph 3: [Social proof] + [Reassurance]\nCTA: [Action verb] + [Small commitment] + [Scarcity]" },
      principles: [
        { he: "✓ מחסור + ביטחון (השפעה +35%)", en: "✓ Scarcity + Reassurance (+35% impact)" },
        { he: "✓ סיפור + נתונים משולבים (השפעה +40%)", en: "✓ Story + Data integration (+40% impact)" },
        { he: "✓ הוכחה חברתית + סמכות (השפעה +38%)", en: "✓ Social proof + Authority (+38% impact)" },
        { he: "✓ הדדיות + התחייבות (השפעה +30%)", en: "✓ Reciprocity + Commitment (+30% impact)" },
      ],
    };
  }

  // ═══════════════════════════════════════════════
  // COPY FORMULAS (Historical Masters)
  // ═══════════════════════════════════════════════
  const formulas: CopyFormula[] = [];

  // PAS — Problem-Agitation-Solution (universal, best for email/landing)
  formulas.push({
    name: { he: "PAS – בעיה, הגברה, פתרון", en: "PAS – Problem, Agitation, Solution" },
    origin: "Eugene Schwartz / Dan Kennedy",
    structure: { he: "1. הצג את הבעיה\n2. הגבר את הכאב (מה קורה אם לא פותרים?)\n3. הצג את הפתרון שלך", en: "1. State the problem\n2. Agitate the pain (what happens if unsolved?)\n3. Present your solution" },
    example: { he: "\"מבזבז שעות על דוחות ידניים? (בעיה)\nכל חודש שעובר, המתחרים שלך מתקדמים יותר מהר. (הגברה)\nהמערכת שלנו הופכת 4 שעות עבודה ל-15 דקות. (פתרון)\"", en: "\"Wasting hours on manual reports? (Problem)\nEvery month that passes, your competitors move faster. (Agitation)\nOur system turns 4 hours of work into 15 minutes. (Solution)\"" },
    bestFor: ["Email", "Landing Pages", "Google Ads"],
    conversionLift: "+25-35%",
  });

  // AIDA — Attention, Interest, Desire, Action
  formulas.push({
    name: { he: "AIDA – קשב, עניין, רצון, פעולה", en: "AIDA – Attention, Interest, Desire, Action" },
    origin: "E. St. Elmo Lewis (1898)",
    structure: { he: "1. קשב: כותרת שתופסת\n2. עניין: למה זה רלוונטי אליך\n3. רצון: דמיין את התוצאה\n4. פעולה: CTA ברור", en: "1. Attention: Grabbing headline\n2. Interest: Why it's relevant to you\n3. Desire: Imagine the result\n4. Action: Clear CTA" },
    example: { he: "\"[A] 73% מהצוותים מבזבזים 23% מהזמן בפגישות\n[I] אם אתה מנהל צוות של 10+, זה עולה לך ₪50K בשנה\n[D] דמיין: צוות שמסיים יום עבודה ב-4:30 במקום 7:00\n[A] התחל ניסיון חינם של 14 יום\"", en: "\"[A] 73% of teams waste 23% of time in meetings\n[I] If you manage 10+ people, that costs $50K/year\n[D] Imagine: a team that finishes by 4:30 instead of 7:00\n[A] Start a free 14-day trial\"" },
    bestFor: ["Sales Pages", "Facebook Ads", "Email Sequences"],
    conversionLift: "+20-30%",
  });

  // BAB — Before-After-Bridge (great for storytelling)
  formulas.push({
    name: { he: "BAB – לפני, אחרי, גשר", en: "BAB – Before, After, Bridge" },
    origin: "Robert Collier (1931)",
    structure: { he: "1. לפני: המצב הכואב עכשיו\n2. אחרי: המצב האידיאלי\n3. גשר: איך להגיע לשם (המוצר שלך)", en: "1. Before: The painful current state\n2. After: The ideal state\n3. Bridge: How to get there (your product)" },
    example: { he: "\"[לפני] מבלה 3 שעות ביום בניהול ידני של קמפיינים\n[אחרי] קמפיינים רצים באוטומט, אתה מתמקד באסטרטגיה\n[גשר] המערכת שלנו אוטומטית את 80% מהעבודה\"", en: "\"[Before] Spending 3 hours daily manually managing campaigns\n[After] Campaigns run automatically, you focus on strategy\n[Bridge] Our system automates 80% of the work\"" },
    bestFor: ["Instagram", "LinkedIn", "Email"],
    conversionLift: "+30-40%",
  });

  // B2B-specific: Caples' Question Formula
  if (isB2B) {
    formulas.push({
      name: { he: "נוסחת השאלה של Caples", en: "Caples' Question Formula" },
      origin: "John Caples (1932) – +55% CTR",
      structure: { he: "פתח בשאלה שחייבת תשובה – המוח לא יכול להתעלם משאלה פתוחה. השאלה חייבת לגעת בכאב או בפער ידע", en: "Open with a question that demands an answer – the brain can't ignore an open question. The question must touch a pain point or knowledge gap" },
      example: { he: "\"האם אתה עושה את 3 הטעויות האלה ב-Pipeline שלך?\"\n\"למה 73% מה-Startups נכשלים בשנה הראשונה – ומה 27% עושים אחרת?\"", en: "\"Do you make these 3 mistakes in your Pipeline?\"\n\"Why do 73% of startups fail in year one – and what do the 27% do differently?\"" },
      bestFor: ["LinkedIn", "Email Subject Lines", "Blog Headlines"],
      conversionLift: "+55% CTR (Caples' highest)",
    });
  }

  // B2C-specific: Hopkins' Direct Response
  if (isB2C) {
    formulas.push({
      name: { he: "ארכיטקטורת תגובה ישירה – Hopkins", en: "Hopkins' Direct Response Architecture" },
      origin: "Claude Hopkins (1923)",
      structure: { he: "1. פתח בתועלת ספציפית (לא תכונה)\n2. הוביל עם האינטרס של הקורא (לא המוצר)\n3. ספר סיפור מרתק\n4. הצע הצעה ספציפית\n5. CTA חזק\n6. הוסף תמריץ/ניסיון", en: "1. Start with specific benefit (not feature)\n2. Lead with reader's self-interest (not product)\n3. Tell a compelling story\n4. Make a specific offer\n5. Strong CTA\n6. Add incentive/trial" },
      example: { he: "\"[תועלת] ייפטר מהעייפות הזו תוך 10 ימים\n[אינטרס] בלי לשלם הון לרופאים\n[סיפור] שרה הרגישה תשושה כל יום עד ש...\n[הצעה] דוגמית חינם + מדריך\n[CTA] הזמן עכשיו – משלוח חינם\"", en: "\"[Benefit] Get rid of that tired feeling in 10 days\n[Self-interest] Without spending a fortune on doctors\n[Story] Sarah felt exhausted every day until...\n[Offer] Free sample + guide\n[CTA] Order now – free shipping\"" },
      bestFor: ["Sales Pages", "Facebook Ads", "Landing Pages"],
      conversionLift: "+30-45%",
    });
  }

  // ═══════════════════════════════════════════════
  // WRITING TECHNIQUES (Neurocopywriting + Linguistics)
  // ═══════════════════════════════════════════════
  const techniques: WritingTechnique[] = [];

  // High-Arousal Words (always relevant)
  techniques.push({
    name: { he: "מילים בעוצמה גבוהה (High-Arousal)", en: "High-Arousal Word Selection" },
    description: { he: "החלף מילים ניטרליות במילים שמפעילות את האמיגדלה אוטומטית – 31-45% יותר קליקים", en: "Replace neutral words with words that auto-activate the amygdala – 31-45% higher CTR" },
    doExample: { he: "\"הפסק לבזבז כסף\" | \"טרנספורמטיבי\" | \"תפוס הזדמנות\"", en: "\"Stop wasting money\" | \"Transformative\" | \"Seize the opportunity\"" },
    dontExample: { he: "\"חסוך כסף\" | \"איכות טובה\" | \"קבל גישה\"", en: "\"Save money\" | \"Good quality\" | \"Get access\"" },
    metric: "+31-45% CTR",
  });

  // Active Voice
  techniques.push({
    name: { he: "פעיל, לא סביל", en: "Active Voice, Not Passive" },
    description: { he: "המוח מעבד משפט סביל באיטיות כפולה. משפט פעיל = הבנה מהירה יותר ב-40-50%", en: "The brain processes passive voice nearly twice as slow. Active voice = 40-50% faster comprehension" },
    doExample: { he: "\"חקרנו 500 צוותים וגילינו שאוטומציה משפרת פרודוקטיביות\"", en: "\"We researched 500 teams and discovered automation improves productivity\"" },
    dontExample: { he: "\"לאחר שמחקר נרחב בוצע, התגלה שהפרודוקטיביות יכולה להשתפר\"", en: "\"After extensive research was conducted, it was discovered that productivity could improve\"" },
    metric: "+40-50% comprehension",
  });

  // SVO Word Order
  techniques.push({
    name: { he: "סדר מילים SVO (נושא-פועל-מושא)", en: "SVO Word Order (Subject-Verb-Object)" },
    description: { he: "המוח מעבד SVO בהפעלה אחת. סדר מילים מורכב דורש 20% יותר מאמץ קוגניטיבי ו-2 הפעלות מוחיות", en: "The brain processes SVO in one activation. Complex word order requires 20% more cognitive effort and 2 brain activations" },
    doExample: { he: "\"המערכת שלנו חוסכת לך זמן. כך זה עובד...\"", en: "\"Our system saves you time. Here's how...\"" },
    dontExample: { he: "\"זמן, תחסוך בעזרת המערכת שלנו באופן משמעותי לאורך זמן\"", en: "\"Time, you will save significantly over time by implementing our system\"" },
    metric: "-20% cognitive load",
  });

  // Sentence Rhythm
  techniques.push({
    name: { he: "קצב משפטים (קצר-ארוך-קצר)", en: "Sentence Rhythm (Short-Long-Short)" },
    description: { he: "חילוף בין משפטים קצרים (3-8 מילים) לארוכים (20+) מייצר קצב שמגביר מעורבות ב-23%", en: "Alternating short (3-8 words) and long (20+) sentences creates rhythm that boosts engagement by 23%" },
    doExample: { he: "\"תפסיק לבזבז זמן. רוב המנהלים מבלים 23% מהשבוע בפגישות, לפי נתוני הלמ\"ס. זה בלתי מקובל.\"", en: "\"Stop wasting time. Most professionals spend 23% of their week in meetings, according to Bureau of Labor Statistics. That's unacceptable.\"" },
    dontExample: { he: "\"רוב המנהלים מבזבזים זמן. הם מבלים שעות בפגישות. הם צריכים פתרון. אנחנו מציעים פתרון.\"", en: "\"Most managers waste time. They spend hours in meetings. They need a solution. We offer a solution.\"" },
    metric: "+23% engagement time",
  });

  // Story + Data Integration (Neurocopywriting 3.A.3)
  techniques.push({
    name: { he: "שילוב סיפור + נתון (לא רציף)", en: "Story + Data Integration (Not Sequential)" },
    description: { he: "שלב נרטיב והוכחה באותה פסקה – לא בנפרד. מפעיל לימבי + ניאוקורטקס במקביל = 22% יותר זיכרון", en: "Mix narrative and proof in the same paragraph – not separately. Activates limbic + neocortex in parallel = 22% more memory retention" },
    doExample: { he: "\"שרה הפסידה ₪40K – מה שמחקר MIT מראה שקורה ל-47% מהמייסדים ש...\"", en: "\"Sarah lost $40K—which MIT research shows happens to 47% of founders who...\"" },
    dontExample: { he: "\"שרה הפסידה ₪40K (פסקה 1) / הנה המחקר (פסקה 2)\"", en: "\"Sarah lost $40K (paragraph 1) / Here's the research (paragraph 2)\"" },
    metric: "+22% memory, +19% conversion",
  });

  // For advanced users: add more techniques
  if (isAdvanced) {
    techniques.push({
      name: { he: "שפה חושית (Sensory Language)", en: "Sensory Language Deployment" },
      description: { he: "החלף שמות תואר מופשטים בתיאורים חושיים ספציפיים – מפעיל את הקורטקס המוטורי ב-19% יותר", en: "Replace abstract adjectives with specific sensory descriptions – activates motor cortex 19% more" },
      doExample: { he: "\"ממשק שקוף כבדולח\" | \"תגובה מהירה כברק\" | \"זרימה חלקה\"", en: "\"Crystal-clear interface\" | \"Lightning-quick response\" | \"Effortless workflow\"" },
      dontExample: { he: "\"חוויה טובה\" | \"ביצועים טובים\" | \"תהליך קל\"", en: "\"Great experience\" | \"Good performance\" | \"Easy process\"" },
      metric: "+19% motor cortex, +12-18% engagement",
    });

    techniques.push({
      name: { he: "שקיפות שכנוע (לקוראי Level 4)", en: "Persuasion Transparency (Level 4 Readers)" },
      description: { he: "לקוראים מטא-קוגניטיביים: חשוף את טכניקת השכנוע שאתה משתמש בה – שקיפות מגבירה אמון ב-50%", en: "For meta-cognitive readers: reveal the persuasion technique you're using – transparency boosts trust by 50%" },
      doExample: { he: "\"אנחנו משתמשים כאן ב-framing של הפסד – והנה למה זה עובד ולמה אנחנו מאמינים שזה אתי\"", en: "\"We're using loss-aversion framing here – and here's why it works and why we believe it's ethical\"" },
      dontExample: { he: "\"הזדמנות אחרונה! רק 3 מקומות!\" (מניפולציה חבויה שעלולה לגרום ל-BACKFIRE של -70%)", en: "\"Last chance! Only 3 spots!\" (hidden manipulation that can BACKFIRE by -70%)" },
      metric: "+50% trust (Level 4), -70% if hidden",
    });
  }

  return {
    readerProfile,
    formulas,
    writingTechniques: isBeginner ? techniques.slice(0, 3) : techniques,
  };
}

function getPersonalBrandData(data: FormData): PersonalBrandData | undefined {
  if (data.businessField !== "personalBrand" && data.businessField !== "services") return undefined;

  const isB2B = data.audienceType === "b2b" || data.audienceType === "both";
  const positioningTips: { he: string; en: string }[] = [];

  if (isB2B) {
    positioningTips.push(
      { he: "🏢 B2B מיתוג: מצב את עצמך כ'מנטור' שמבין את הכאב העסקי של ה-ICP – לא כ'ספק שירות' אלא כ'שותף אסטרטגי'", en: "🏢 B2B Branding: Position yourself as the 'Mentor' who understands ICP's business pain – not a 'service provider' but a 'strategic partner'" },
      { he: "📊 Consultative Selling: בנה תהליך מכירה ייעוצי – אבחון → Tripwire → עסקה מלאה. הראה ערך לפני שאתה מבקש תשלום", en: "📊 Consultative Selling: Build a consultative sales process – diagnostic → Tripwire → full deal. Show value before asking for payment" },
    );
  } else {
    positioningTips.push(
      { he: "🎬 B2C מיתוג: אותנטיות > הפקה. שתף את התהליך (Building in Public), לא רק תוצאות. הקהל מתחבר לאנשים, לא למותגים", en: "🎬 B2C Branding: Authenticity > Production. Share the process (Building in Public), not just results. Audiences connect with people, not brands" },
      { he: "📱 Creator Economy: בנה קהל לפני שאתה מוכר. ניוזלטר + קהילה = בעלות על הקהל שלך (לא תלוי באלגוריתם)", en: "📱 Creator Economy: Build an audience before selling. Newsletter + community = own your audience (not algorithm-dependent)" },
    );
  }

  positioningTips.push(
    { he: "🎭 פרדוקס האותנטיות: שתף פגיעויות אסטרטגיות (Weaponized Vulnerability) – כישלון שמסתיים בתובנה בונה אמון חזק יותר מסיפורי הצלחה", en: "🎭 Authenticity Paradox: Share strategic vulnerabilities (Weaponized Vulnerability) – failure ending with insight builds stronger trust than success stories" },
    { he: "🏗️ Conformity Breakout: זהה 'אמיתות מקובלות' בתעשייה שאתה חולק עליהן – Contrarian Takes ממצבים אותך כמחשב עצמאי", en: "🏗️ Conformity Breakout: Identify 'accepted truths' you disagree with – Contrarian Takes position you as an independent thinker" },
  );

  // Signal priority by field
  const signalPriority: PersonalBrandData["signalPriority"] = [];
  const field = data.businessField === "personalBrand" ? data.interests.toLowerCase() : data.businessField;

  if (field.includes("tech") || field.includes("טכנולוגיה")) {
    signalPriority.push(
      { signal: "shipped-products", name: { he: "מוצרים שנשלחו", en: "Shipped Products" }, description: { he: "מוצרים ופרויקטים שהשקת – הדמו הטוב ביותר הוא מוצר עובד", en: "Products and projects you've launched – the best demo is a working product" } },
      { signal: "open-source", name: { he: "תרומות קוד פתוח", en: "Open Source Contributions" }, description: { he: "תרומות ל-Open Source, כלים שיצרת, GitHub stars – סיגנל של מומחיות אמיתית", en: "Open Source contributions, tools you built, GitHub stars – signal of real expertise" } },
      { signal: "technical-writing", name: { he: "כתיבה טכנית", en: "Technical Writing" }, description: { he: "בלוג טכני, תיעוד, הסברים מעמיקים – מי שמסביר טוב, מבין טוב", en: "Technical blog, documentation, deep explanations – those who explain well, understand well" } },
    );
  } else if (field.includes("consult") || field.includes("ייעוץ") || field === "services") {
    signalPriority.push(
      { signal: "case-studies", name: { he: "Case Studies", en: "Case Studies" }, description: { he: "תיעוד תוצאות עם מספרים ספציפיים: 'מ-X ל-Y תוך Z חודשים' – ROI Epic", en: "Documented results with specific numbers: 'from X to Y in Z months' – ROI Epic" } },
      { signal: "methodology", name: { he: "מתודולוגיה ממותגת", en: "Branded Methodology" }, description: { he: "Framework ייחודי עם שם ממותג – הופך אותך מ'עוד יועץ' ל'ממציא הגישה'", en: "Unique framework with branded name – transforms you from 'another consultant' to 'the approach creator'" } },
      { signal: "speaking", name: { he: "הרצאות וכנסים", en: "Speaking & Conferences" }, description: { he: "הופעות על במה, פודקאסטים, וובינרים – Halo Effect מהסביבה הממותגת", en: "Stage appearances, podcasts, webinars – Halo Effect from the branded environment" } },
    );
  } else {
    signalPriority.push(
      { signal: "portfolio", name: { he: "תיק עבודות", en: "Portfolio" }, description: { he: "עבודות מתועדות עם תוצאות – הוכחה ויזואלית של היכולת שלך", en: "Documented work with results – visual proof of your capability" } },
      { signal: "testimonials", name: { he: "המלצות", en: "Testimonials" }, description: { he: "המלצות וידאו מלקוחות – Social Proof מהסוג החזק ביותר", en: "Video testimonials from clients – the strongest form of Social Proof" } },
      { signal: "thought-leadership", name: { he: "מנהיגות מחשבתית", en: "Thought Leadership" }, description: { he: "תוכן מקורי שמראה חשיבה עצמאית – מאמרים, ניוזלטר, פודקאסט", en: "Original content showing independent thinking – articles, newsletter, podcast" } },
    );
  }

  const authenticityGuidance: { he: string; en: string }[] = [
    { he: "🎯 הגדר את ה-No-Go Zone: מה אתה לא משתף? גבולות בריאים הם חלק מאותנטיות – לא צריך לחשוף הכל", en: "🎯 Define your No-Go Zone: what don't you share? Healthy boundaries are part of authenticity – you don't need to expose everything" },
    { he: "📖 Hero's Journey אישי: מצב התחלתי → משבר/כישלון → תובנה מכוננת → טרנספורמציה – זה הנרטיב שמחבר אנשים", en: "📖 Personal Hero's Journey: starting point → crisis/failure → formative insight → transformation – this is the narrative that connects people" },
    { he: "⚖️ כיול Halo/Horn: היה מודע לאפקט ההילה (תכונה אחת טובה צובעת הכל) ואפקט ה-Horn (תכונה שלילית אחת הורסת) – נהל את שניהם במודע", en: "⚖️ Halo/Horn Calibration: Be aware of the Halo Effect (one good trait colors everything) and Horn Effect (one negative trait ruins all) – manage both consciously" },
  ];

  return { positioningTips, signalPriority, authenticityGuidance };
}

export function generateFunnel(data: FormData): FunnelResult {
  const weights = getStageWeights(data);
  const budget = getBudgetRange(data.budgetRange);

  const isB2B = data.audienceType === "b2b" || data.audienceType === "both";
  const isPersonalBrand = data.businessField === "personalBrand";

  const stageDefinitions = isPersonalBrand ? [
    { id: "awareness", name: { he: "נישה ו-ICP", en: "Niche & ICP Definition" }, desc: { he: "הגדרת המשולש הזהב (מומחיות × עניין × ביקוש), זיהוי ה-ICP, ומיפוי הנוף התחרותי", en: "Defining the Golden Triangle (expertise × interest × demand), identifying your ICP, and mapping the competitive landscape" } },
    { id: "engagement", name: { he: "UVP ואוקיינוס כחול", en: "UVP & Blue Ocean" }, desc: { he: "מיצוב ייחודי באמצעות מטריצת ERRC, בידול מהמתחרים, ויצירת קטגוריה חדשה", en: "Unique positioning using ERRC Matrix, differentiation from competitors, and creating a new category" } },
    { id: "leads", name: { he: "בניית סיגנלים ואמינות", en: "Signal Building & Credibility" }, desc: { he: "בניית סיגנלים יקרים (Costly Signals): Case Studies, Thought Leadership, המלצות – היררכיית הוכחות לפי הסקטור שלך", en: "Building Costly Signals: Case Studies, Thought Leadership, testimonials – proof hierarchy for your sector" } },
    { id: "conversion", name: { he: "תוכן ומנהיגות מחשבתית", en: "Content & Thought Leadership" }, desc: { he: "מגבר אפקט הילה (Halo Amplifier), ארכיטקטורת נרטיב, ו-Contrarian Takes שמבדילים אותך", en: "Halo Amplifier, narrative architecture, and Contrarian Takes that set you apart" } },
    { id: "retention", name: { he: "קהילה ואפקט רשת", en: "Community & Network Effects" }, desc: { he: "בניית דביקות רשת (Network Stickiness), Alumni Network, תוכנית Referral, ואפקט Flywheel", en: "Building Network Stickiness, Alumni Network, Referral program, and Flywheel effect" } },
  ] : isB2B ? [
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
    hookTips: getHookTips(data),
    copyLab: getCopyLabData(data),
    kpis: getKpis(data),
    createdAt: new Date().toISOString(),
    formData: data,
    personalBrand: getPersonalBrandData(data),
  };
}
