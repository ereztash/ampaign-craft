// ═══════════════════════════════════════════════
// 20 Synthetic Personas — Differentiation Validation
//
// Each persona is a fully-populated DifferentiationFormData plus metadata
// (archetype, bias, segment, expectedFailureMode). The harness runs every
// persona through generateDifferentiation() and red-teams the output.
//
// Distribution (per plan):
//   4× b2b_services, 4× b2c_services,
//   3× b2b_saas,    3× b2c_creator,
//   3× edge_case,   3× failure_state
//
// Personas are NOT a sample; they are a stress-test set. Each one carries
// an expectedFailureMode hypothesis the harness can verify.
// ═══════════════════════════════════════════════

import type { DifferentiationFormData } from "@/types/differentiation";
import type { SyntheticPersona } from "./personaSchema";

// ─── Defaults builder ──────────────────────────────────────────────────────

function baseFormData(overrides: Partial<DifferentiationFormData>): DifferentiationFormData {
  const base: DifferentiationFormData = {
    businessName: "",
    industry: "",
    targetMarket: "b2b",
    companySize: "solo",
    currentPositioning: "",
    topCompetitors: [],
    priceRange: "mid",
    claimExamples: [],
    customerQuote: "",
    lostDealReason: "",
    negativeReviewTheme: "",
    returnReason: "",
    competitorOverlap: "",
    ashamedPains: [],
    hiddenValues: [],
    internalFriction: "",
    competitorArchetypes: [],
    buyingCommitteeMap: [],
    influenceNetwork: [],
    decisionLatency: "weeks",
    decisionSpeed: "days",
    discoveryChannels: [],
    confirmedTradeoffs: [],
    selectedHybridCategory: "",
  };
  return { ...base, ...overrides };
}

// ─── 20 personas ────────────────────────────────────────────────────────────

export const personas: SyntheticPersona[] = [
  // ── 4× B2B services ──
  {
    id: "p01",
    archetype: "יועץ הייטק עצמאי, 12K/חודש, מוכר 'אסטרטגיה' אבל לא יודע להסביר במה הוא שונה",
    segment: "b2b_services",
    bias: "dunning_kruger",
    expectedFailureMode: "engine יחזיר משפט גנרי כי כל הקלטים שלו מופשטים",
    linkedinPosts: [
      "מה ההבדל בין יועץ שנותן המלצות לבין יועץ שמוביל שינוי? הראשון עוזב עם מצגת. השני נשאר עד שה-CEO יכול לשחזר את ההחלטה בלעדיו — כי אם הוא לא יכול, לא השתנה כלום.",
      "שלוש חברות שעבדתי איתן ב-2025 הכפילו ARR. לא בגלל framework חדש. בגלל שהפסיקו לאפשר ל-CEO לענות על אימיילים של לקוחות בעצמו.",
      "GTM strategy היא לא שאלה של ערוץ. היא שאלה של מי הלקוח שכבר קיים שהכי מרוויח ממך — ועדיין לא הבין למה.",
    ],
    lostDealMoments: [
      "הם אמרו: 'אנחנו צריכים מישהו שהוועדה כבר מכירה'. McKinsey עבדה איתם בסיבוב הקודם.",
      "שאלו אם יש לי case study ב-fintech ספציפי. לא היה. 'נשמע לנו שאתה כללי מדי.'",
      "ה-CFO עצר ושאל: 'מה יהיה אם תחלה באמצע המעבר?' — לא ידעתי מה להגיד.",
    ],
    formData: baseFormData({
      businessName: "Sharon Strategy",
      industry: "ייעוץ אסטרטגי להייטק",
      targetMarket: "b2b_smb",
      currentPositioning: "אני עוזר לחברות לצמוח",
      topCompetitors: ["McKinsey", "BCG ישראל", "יועצים עצמאיים"],
      priceRange: "premium",
      claimExamples: [
        { claim: "מנוסה", evidence: "", verified: false, gap: "אין case study" },
        { claim: "תוצאות מוכחות", evidence: "עזרתי ל-3 חברות לגייס", verified: false, gap: "אין מספרים" },
      ],
      customerQuote: "שרון יודע לשאול את השאלות הנכונות",
      lostDealReason: "החברה בחרה McKinsey",
      hiddenValues: [{ valueId: "legitimacy", score: 5, signal: "לקוחות מבקשים case studies" }],
    }),
  },
  {
    id: "p02",
    archetype: "מאמן עסקי, 8K/חודש, יודע מה הוא עושה אבל לא יודע איך לקרוא לזה",
    linkedinPosts: [
      "אימון עסקי טוב לא אמור לגרום לך להרגיש טוב. הוא אמור לגרום לך לעשות את הדבר שדחית 3 חודשים.",
      "עברתי 10 שנים בניהול לפני שהפכתי למאמנת. ההבדל שזה עושה: אני יודעת להבחין בין 'לא יכול' ל'לא רוצה'. זה משנה את השיחה.",
      "הלקוח הכי טוב שלי מגיע עם 12 תירוצים. בסוף 12 השבועות הוא יודע שהרשימה הייתה שקר — וזה בידיו.",
    ],
    lostDealMoments: [
      "הם אמרו: 'יש תוכנית קבוצתית ב-200 שקל לחודש. למה לשלם לך פי 10?' — לא ידעתי לתת תשובה ספציפית.",
      "שאלו מה ה-KPI שנמדוד בסוף. לא הייתה לי תשובה מספרית. 'נשמע לנו סובייקטיבי.'",
      "הלכו למאמן מפורסם מהפודקאסט כי 'יודע להסביר תוצאות בצורה מוכחת'.",
    ],
    segment: "b2b_services",
    expectedFailureMode: "המנגנון שלו ('שיחות שבועיות') לא נראה ייחודי בשטח",
    formData: baseFormData({
      businessName: "Yael Coach",
      industry: "אימון בעלי עסקים קטנים",
      targetMarket: "b2b_smb",
      currentPositioning: "מאמנת עסקית עם תוכנית 12 שבועות",
      topCompetitors: ["מאמנים עצמאיים", "תוכניות online", "BNI"],
      priceRange: "mid",
      claimExamples: [
        { claim: "10 שנות ניסיון", evidence: "10 שנים בתפקידי ניהול", verified: true, gap: "" },
        { claim: "תוצאות מהירות", evidence: "לקוח X הכפיל הכנסות תוך 6 חודשים", verified: true, gap: "מקרה אחד" },
      ],
      customerQuote: "יעל גורמת לי לעשות מה שאני יודעת שצריך לעשות",
      lostDealReason: "מחיר",
      hiddenValues: [
        { valueId: "empathy", score: 5, signal: "" },
        { valueId: "narrative", score: 4, signal: "" },
      ],
    }),
  },
  {
    id: "p03",
    archetype: "סוכנות שיווק קטנה, 5 עובדים, מפסידה למחיר באופן שיטתי",
    segment: "b2b_services",
    bias: "sunk_cost",
    expectedFailureMode: "מנסה להתחרות במחיר במקום למצוא מנגנון",
    linkedinPosts: [
      "כשאנחנו מקבלים לקוח, מי שמוכר הפרויקט הוא גם מי שמבצע אותו. לא מנהל שמוסר לג'וניור.",
      "לקוח שהגיע אלינו אחרי 3 פרילנסרים אמר: 'הם עשו מה שביקשתי'. אנחנו עשינו מה שצריך — זה לא אותו דבר.",
      "full-service מ-5 אנשים נשמע כמו פשרה. אבל פשרה היא לשלם לסוכנות של 40 אנשים כשרואים רק ג'וניורים.",
    ],
    lostDealMoments: [
      "הם בחרו סוכנות שהציעה ב-30% פחות. 'המחיר שלכם יקר בלי שיש להם שם'. חזרו אלינו אחרי חצי שנה — הנזק נעשה.",
      "שאלו אם אנחנו עושים TikTok organic. לא היה בנו. זה עצר הכל.",
      "אמרו: 'אנחנו צריכים סוכנות שמכירה את ה-biotech sector'. לא הייתה לנו התמחות ספציפית.",
    ],
    formData: baseFormData({
      businessName: "Pixel Agency",
      industry: "סוכנות שיווק דיגיטלי",
      targetMarket: "b2b_smb",
      companySize: "2-10",
      currentPositioning: "סוכנות full-service במחיר נגיש",
      topCompetitors: ["סוכנויות פרילנס", "Wix Studio", "סוכנויות גדולות"],
      priceRange: "budget",
      claimExamples: [
        { claim: "מחירים נגישים", evidence: "20% מתחת לממוצע השוק", verified: true, gap: "" },
        { claim: "צוות מנוסה", evidence: "", verified: false, gap: "אין מספרי שנים" },
      ],
      lostDealReason: "מתחרה הציע ב-30% פחות",
      negativeReviewTheme: "איטיים בתגובות",
      hiddenValues: [{ valueId: "cognitive_ease", score: 3, signal: "" }],
    }),
  },
  {
    id: "p04",
    archetype: "עו\"ד מסחרי, מתמחה בהיי-טק, מתחרה מול משרדים גדולים",
    segment: "b2b_services",
    expectedFailureMode: "הרגולציה והגבלות הפרסום מקשות על משפט בידול 'תוקפני'",
    linkedinPosts: [
      "85 עסקאות M&A ב-2024. מה שלמדתי: 80% מהמחלוקות מתחילות בשיחת המשא ומתן, לא בחתימה. כשאני נמצא בשיחה — מעצבים עסקה, לא מתקנים נזק.",
      "לקוח מתקשר ב-11 בלילה לפני signing. הוא לא צריך מחקר. הוא צריך תשובה. זה הבדל שמשרד של 50 עורכי דין מבני לא יכול לספק.",
      "מי שלא בדק את ה-term sheet לפני שהמשקיע חתם — שילם על זה ב-3 סעיפים שנה אחר כך. בדיקה עצמאית לפני term sheet היא ביטוח, לא הוצאה.",
    ],
    lostDealMoments: [
      "הלקוח הלך עם המשרד שה-VC ממליץ עליו. אמר: 'הם כבר מכירים את המשקיע ואת הדינמיקה של הסיבוב'.",
      "ביקשו ניסיון ספציפי בסדרה C בסקטור הביו. היה לי B בלבד. 'זה לא אותו מורכבות'.",
      "אמרו שהם צריכים 'שם שכולם בסיבוב מכירים' — legitimacy מול המשקיעים.",
    ],
    formData: baseFormData({
      businessName: "Levin Law",
      industry: "ייעוץ משפטי לחברות הייטק",
      targetMarket: "b2b",
      companySize: "2-10",
      currentPositioning: "משרד בוטיק עם זמן תגובה מהיר",
      topCompetitors: ["משרדים גדולים", "מחלקות משפטיות פנים-חברתיות"],
      priceRange: "premium",
      claimExamples: [
        { claim: "תגובה תוך 24 שעות", evidence: "SLA חוזי", verified: true, gap: "" },
        { claim: "מומחיות בעסקאות M&A", evidence: "85 עסקאות ב-2024", verified: true, gap: "" },
      ],
      customerQuote: "אני מקבל תשובה ביום אצל לוין, ושבוע במשרד הגדול",
      lostDealReason: "הלקוח הלך עם משרד שכבר עבד עם המשקיע",
      hiddenValues: [
        { valueId: "risk", score: 5, signal: "" },
        { valueId: "autonomy", score: 4, signal: "" },
      ],
    }),
  },

  // ── 4× B2C services ──
  {
    id: "p05",
    archetype: "מטפלת רגשית, קהל לא ברור, מנסה למשוך 'נשים בנות 30-50'",
    segment: "b2c_services",
    bias: "confirmation",
    expectedFailureMode: "ICP רחב מדי → engine יחזיר משפט גנרי",
    linkedinPosts: [
      "רוב הנשים שמגיעות אלי לא צריכות 'לעבוד על עצמן'. הן צריכות להפסיק לעבוד על כולם סביבן.",
      "גישה קוגניטיבית-רגשית היא כלי. אני לא מחויבת לכלי. אני מחויבת לתוצאה שמשתנה בחיים, לא רק בחדר הטיפולים.",
      "שאלה שאני שואלת בפגישה ראשונה: 'מה קיים בחיים שלך שאת לא מתארת לאנשים שאוהבים אותך?' — שם נמצאת העבודה.",
    ],
    lostDealMoments: [
      "שאלה: 'כמה זמן עד שאראה שינוי?' — לא הצלחתי לתת מסגרת מספרית ספציפית. 'נשמע לי לא ממוקד.'",
      "הלכה לפסיכולוגית בקופה — 'כי יש החזר מביטוח ולא צריך לשלם מהכיס'.",
      "אמרה שמחפשת מישהי עם 'גישה מובנית יותר, כמו DBT ספציפי — לא כללי'.",
    ],
    formData: baseFormData({
      businessName: "Sigal Therapy",
      industry: "טיפול רגשי / קוגניטיבי",
      targetMarket: "b2c_service",
      currentPositioning: "טיפול רגשי לנשים מתמודדות",
      topCompetitors: ["פסיכולוגים בקופה", "אפליקציות mental health", "מטפלות אחרות"],
      priceRange: "mid",
      claimExamples: [
        { claim: "גישה אינטגרטיבית", evidence: "", verified: false, gap: "" },
        { claim: "מקשיבה באמת", evidence: "ביקורות גוגל 4.9", verified: true, gap: "" },
      ],
      customerQuote: "אצל סיגל אני מרגישה נראית",
      negativeReviewTheme: "לא מספיק מובנה",
      returnReason: "לא רואות תוצאות מהירות",
      hiddenValues: [{ valueId: "empathy", score: 5, signal: "" }],
    }),
  },
  {
    id: "p06",
    archetype: "קליניקה אסתטית, תלויה בהמלצות, פחד להעלות מחיר",
    segment: "b2c_services",
    expectedFailureMode: "המסר 'איכות' לא יחזיק מול קליניקה זולה יותר",
    linkedinPosts: [
      "ד\"ר רוזן לא מקבל לקוחה שלא עברה ייעוץ ראשוני. לא כי זה נוהל — כי תוצאות טבעיות מתחילות בהבנת הפנים, לא ב'כמה cc'.",
      "קליניקה שגובה פחות לא בהכרח נותנת פחות. קליניקה שמבצעת ב-10 דקות — בוודאי נותנת פחות.",
      "80% מהלקוחות שלנו הגיעו מהמלצה אישית. לא מגוגל. זה מה שקורה כשמישהי מגיעה עם תוצאה שאי אפשר לשאול אותה.",
    ],
    lostDealMoments: [
      "לקוחה חיפשה מחיר — מצאה קליניקה ב-Groupon שעלתה פחות משליש. 'זה אותו בוטוקס'.",
      "שאלה אם אפשר לקבוע ב-2 ימים הקרובים — לא היה מקום. 'אז אני הולכת למקום שיש מקום'.",
      "אמרה שחברה הלכה למקום שיש שם רופאה אישה — 'מרגיש נוח יותר'. ד\"ר רוזן גבר.",
    ],
    formData: baseFormData({
      businessName: "Glow Clinic",
      industry: "קליניקה אסתטית — בוטוקס וחומצה",
      targetMarket: "b2c_service",
      companySize: "2-10",
      currentPositioning: "קליניקה איכותית בלב תל אביב",
      topCompetitors: ["קליניקות זולות", "רופאים פרטיים", "מרפאות אסתטיות גדולות"],
      priceRange: "premium",
      claimExamples: [
        { claim: "רופא בכיר", evidence: "מומחה ברפואה אסתטית", verified: true, gap: "" },
        { claim: "תוצאות טבעיות", evidence: "", verified: false, gap: "אין before/after מובנה" },
      ],
      customerQuote: "אני סומכת רק על ד\"ר רוזן",
      negativeReviewTheme: "יקר",
      hiddenValues: [
        { valueId: "risk", score: 5, signal: "" },
        { valueId: "aesthetic", score: 5, signal: "" },
      ],
    }),
  },
  {
    id: "p07",
    archetype: "סטודיו לעיצוב גרפי, סולו, תחרות מחיר משתולל",
    segment: "b2c_services",
    bias: "sunk_cost",
    expectedFailureMode: "אין USP מעבר ל-'אני יותר טובה'",
    linkedinPosts: [
      "Fiverr נותנת לך קובץ. אני נותנת לך מותג שאנשים מזהים בלי לקרוא את השם.",
      "3 לקוחות הגיעו אלי אחרי Canva. כולם שאלו אותו דבר: 'למה זה לא נראה מקצועי?'. כי Canva מעצבת עבורך — לא בשבילך.",
      "כשאני מקבלת בריף — אני לא שואלת 'מה אתה רוצה'. אני שואלת 'מה הלקוח שלך צריך להרגיש'. זה ההבדל.",
    ],
    lostDealMoments: [
      "הציעו ב-Fiverr ב-50 דולר. 'אותה עבודה, פחות כסף'. לא הצלחתי להסביר את ההבדל בשיחת WhatsApp.",
      "שאלו אם אני עושה גם website development. לא — זה עצר אותם. 'רוצים הכל ממקום אחד'.",
      "אמרו שצריכים 'משהו יותר מהיר'. Canva לוקחת 20 דקות ו'מספיק טוב'.",
    ],
    formData: baseFormData({
      businessName: "Studio Maya",
      industry: "עיצוב גרפי לעסקים קטנים",
      targetMarket: "b2c_service",
      currentPositioning: "מעצבת גרפית עם תיק עבודות מגוון",
      topCompetitors: ["Fiverr", "Canva", "מעצבים אחרים"],
      priceRange: "mid",
      claimExamples: [
        { claim: "מהירות", evidence: "מספקת תוך שבוע", verified: true, gap: "" },
        { claim: "אסטרטגיה ולא רק עיצוב", evidence: "", verified: false, gap: "" },
      ],
      lostDealReason: "Fiverr ב-50 דולר",
      negativeReviewTheme: "יקר מדי",
      hiddenValues: [{ valueId: "aesthetic", score: 4, signal: "" }],
    }),
  },
  {
    id: "p08",
    archetype: "מאמן כושר אישי, פרסונאלי, רוצה לעלות מ-1-on-1 ל-תוכנית קבוצתית",
    segment: "b2c_services",
    expectedFailureMode: "engine לא יודע שזה pivot, יציע משפט שמתאים ל-1-on-1",
    linkedinPosts: [
      "85% מהלקוחות שלי מגיעים ליעד תוך 12 שבועות. הסיבה לא פרוטוקול — זה שאני לא מוותר להם לפני שהם מוותרים לעצמם.",
      "אפליקציית כושר לא מתקשרת ביום שמפסיקים. אני כן. זה ההבדל בין כלי לבין מאמן.",
      "עכשיו אני פותח תוכנית קבוצתית. למה? כי 12 שבועות 1:1 עם 60 לקוחות יצרו pattern — ורוצה לחלוק אותו בלי לשכפל את עצמי.",
    ],
    lostDealMoments: [
      "שאלו 'למה 1:1 ולא קבוצה ב-300 שקל לחודש?'. לא הייתה לי תשובה ברורה לפני ה-pivot.",
      "הלכו לאפליקציה ב-50 שקל לחודש — 'ראו תוצאות בפרסומת ונראה'.",
      "אמרו שמאמן מפורסם מהרשת מציע 'program מבוסס מחקר מה-MIT'. לא ידעתי מה להגיד לזה.",
    ],
    formData: baseFormData({
      businessName: "Train With Tomer",
      industry: "אימון כושר אישי וקבוצתי",
      targetMarket: "b2c_service",
      currentPositioning: "מאמן אישי + תוכנית 12 שבועות חדשה",
      topCompetitors: ["חדרי כושר", "אפליקציות כושר", "מאמנים עצמאיים"],
      priceRange: "mid",
      claimExamples: [
        { claim: "תוצאות תוך 12 שבועות", evidence: "85% מהלקוחות מגיעים ליעד", verified: true, gap: "" },
        { claim: "תוכנית ייחודית", evidence: "פיתחתי בעצמי", verified: false, gap: "" },
      ],
      customerQuote: "תומר לא נותן לי לוותר",
      hiddenValues: [
        { valueId: "narrative", score: 5, signal: "" },
        { valueId: "belonging", score: 4, signal: "" },
      ],
    }),
  },

  // ── 3× B2B SaaS / tech ──
  {
    id: "p09",
    archetype: "SaaS startup B2B, 5 עובדים, ARR 200K, מתחרה ב-Notion/Asana",
    segment: "b2b_saas",
    expectedFailureMode: "engine לא ידע להתמודד עם המתחרים הרחבים האלה",
    linkedinPosts: [
      "Jira נבנתה לצוות של 200 איש. אתה צוות של 8. זה לא אותה בעיה — ולכן לא אותו כלי.",
      "שאלתי 50 מנהלי הנדסה מה הפיצ'ר שהכי מפריע להם ב-Linear. 80% אמרו: cycle time reporting. בנינו אותו קודם.",
      "אנחנו ב-90% כמו Linear. ה-10% הם הסיבה שאתה לא פותח Linear ביום שלישי.",
    ],
    lostDealMoments: [
      "הם כבר השתמשו ב-Linear — 'הצוות מכיר ואנחנו באמצע sprint. עלות migration גבוהה מדי עכשיו'.",
      "שאלו אם יש SSO ו-SAML. לא היה בשלב זה. 'ה-IT לא יאשר בלי זה'.",
      "הלכו עם Notion כי ה-CEO רוצה 'הכל במקום אחד — wiki, tasks, docs'.",
    ],
    formData: baseFormData({
      businessName: "Flowtask",
      industry: "ניהול משימות לצוותי הנדסה",
      targetMarket: "b2b_smb",
      companySize: "2-10",
      currentPositioning: "Linear ל-startups קטנים",
      topCompetitors: ["Linear", "Notion", "Asana", "Jira"],
      priceRange: "mid",
      claimExamples: [
        { claim: "מהיר פי 3 מ-Jira", evidence: "benchmark פנימי", verified: false, gap: "" },
        { claim: "אינטגרציה עם GitHub", evidence: "8 webhooks built-in", verified: true, gap: "" },
      ],
      customerQuote: "סוף סוף משהו שלא מאכיל אותנו פיצ'רים",
      lostDealReason: "החברה בחרה Linear כי כבר משתמשים בו",
      hiddenValues: [
        { valueId: "cognitive_ease", score: 5, signal: "" },
        { valueId: "autonomy", score: 4, signal: "" },
      ],
    }),
  },
  {
    id: "p10",
    archetype: "DevTool, מתחרה ב-Datadog, מודל freemium",
    segment: "b2b_saas",
    expectedFailureMode: "המסר 'יותר זול' לא יחזיק מול ספק ארגוני",
    linkedinPosts: [
      "Datadog עושה הכל. אנחנו עושים Kubernetes observability בלבד — ועושים אותו מהיר מ-Datadog ב-40%. הכוונה: פחות noise, יותר signal.",
      "4.2K GitHub stars. כי engineers לא רוצים עוד vendor שמסתיר pricing ב-enterprise plan.",
      "CLI-first אינו trend. זה חזרה לפילוסופיה: תן ל-engineer לראות מה קורה, אל תסתיר את זה ב-dashboard יפה.",
    ],
    lostDealMoments: [
      "ה-CTO אמר: 'Datadog כבר integrated ב-CI pipeline שלנו — עלות migration 6 חודשי עבודה לפחות'.",
      "שאלו אם יש dedicated SLAs ו-enterprise support plan. לא הייתה לנו offering כזו.",
      "הלכו ל-Grafana Cloud כי 'open source ואנחנו מכירים את ה-stack מהעבר'.",
    ],
    formData: baseFormData({
      businessName: "ObserveFast",
      industry: "Observability ל-Kubernetes",
      targetMarket: "b2b",
      companySize: "11-50",
      currentPositioning: "Datadog ל-engineers שאוהבים CLI",
      topCompetitors: ["Datadog", "Grafana Cloud", "New Relic"],
      priceRange: "mid",
      claimExamples: [
        { claim: "30% מהמחיר של Datadog", evidence: "pricing benchmark", verified: true, gap: "" },
        { claim: "open-core", evidence: "github 4.2K stars", verified: true, gap: "" },
      ],
      customerQuote: "ObserveFast גורם ל-Datadog להרגיש כבד",
      hiddenValues: [
        { valueId: "autonomy", score: 5, signal: "" },
        { valueId: "cognitive_ease", score: 4, signal: "" },
      ],
    }),
  },
  {
    id: "p11",
    archetype: "B2B AI tool, מנסה למכור 'AI assistant' לעסקים",
    segment: "b2b_saas",
    bias: "dunning_kruger",
    expectedFailureMode: "engine יחזיר משפט שדומה לכל product page של AI ב-2026",
    linkedinPosts: [
      "Intercom Fin מטפל ב-40% מהטיקטים. AiBoost מטפל ב-70%. ההפרש: אנחנו מחוברים ל-CRM, לא רק ל-help center.",
      "AI שעוצר ואומר 'אני לא יודע' עדיף על AI שמנחש בביטחון. אנחנו בחרנו את הראשון.",
      "בנינו על Claude API לא מסיבות שיווקיות — כי Claude מסביר reasoning. זה אומר לוגים שאפשר לבדוק.",
    ],
    lostDealMoments: [
      "ה-dev team אמר: 'בנינו את זה בעצמנו עם GPT-4 תוך שבועיים. למה לשלם?'",
      "שאלו על SOC 2 Type II. לא היה לנו. 'ה-CISO לא יאשר בלי זה'.",
      "הלכו עם Intercom כי 'ה-CS team כבר מכיר את הinterface ואנחנו לא רוצים שינוי'.",
    ],
    formData: baseFormData({
      businessName: "AiBoost",
      industry: "AI assistant לצוותי שירות לקוחות",
      targetMarket: "b2b_smb",
      companySize: "2-10",
      currentPositioning: "ה-Copilot של שירות לקוחות",
      topCompetitors: ["Intercom Fin", "Zendesk AI", "Custom GPT"],
      priceRange: "mid",
      claimExamples: [
        { claim: "מבוסס Claude", evidence: "API integration", verified: true, gap: "" },
        { claim: "מקטין זמן טיפול ב-40%", evidence: "מחקר פנימי, n=12", verified: false, gap: "" },
      ],
      lostDealReason: "החברה בחרה לבנות פנימית עם GPT-4",
      hiddenValues: [{ valueId: "legitimacy", score: 5, signal: "" }],
    }),
  },

  // ── 3× B2C ecommerce / creators ──
  {
    id: "p12",
    archetype: "מותג D2C אופנה, אינסטגרם-led, גודל קטן, גרפים יורדים",
    segment: "b2c_creator",
    expectedFailureMode: "המסר 'איכות' לא יחזיק מול Shein",
    linkedinPosts: [
      "200 יחידות לדגם. לא כי אין לנו מפעל גדול יותר — כי אנחנו לא רוצים ש-3 נשים יגיעו לאותה מסיבה עם אותה שמלה.",
      "תפירה בקריית גת. לא כי זה זול — כי אני רוצה לדעת מי תופר. Shein לא יודעת.",
      "אופנה מהירה מוכרת לך trend. אנחנו מוכרים בגד שתלבשי גם בעוד 3 שנים.",
    ],
    lostDealMoments: [
      "השוו מחיר ל-Shein ישירות ב-DM. 'זה אותה חולצה, פחות כסף'. לא הצלחתי להסביר את ההבדל בתוך שיחה.",
      "שאלו 'יש לכם חנות פיזית? אני לא קונה אונליין בלי לגעת'. לא. זה עצר חלק.",
      "הלכו ל-Castro כי 'יודעות מה הן מקבלות — ואפשר להחזיר בסניף'.",
    ],
    formData: baseFormData({
      businessName: "Suri",
      industry: "אופנה D2C ישראלית",
      targetMarket: "b2c_ecommerce",
      companySize: "2-10",
      currentPositioning: "מותג אופנה ישראלי איכותי",
      topCompetitors: ["Shein", "Castro", "Zara", "מותגים מקומיים"],
      priceRange: "mid",
      decisionSpeed: "days",
      claimExamples: [
        { claim: "תפירה בארץ", evidence: "מפעל בקריית גת", verified: true, gap: "" },
        { claim: "סטוק קטן", evidence: "200 יחידות לדגם", verified: true, gap: "" },
      ],
      negativeReviewTheme: "מחיר מול Shein",
      returnReason: "לא תאם תיאור",
      hiddenValues: [
        { valueId: "self_expression", score: 5, signal: "" },
        { valueId: "guilt_free", score: 4, signal: "" },
      ],
    }),
  },
  {
    id: "p13",
    archetype: "יוצר תוכן Food, 80K עוקבים, רוצה למכור קורס",
    segment: "b2c_creator",
    expectedFailureMode: "engine לא ידע שהוא מנסה לעשות pivot מ-affiliate ל-product",
    linkedinPosts: [
      "80K עוקבים ועדיין שואלים: 'אבל למה לא לקנות ב-iHerb?'. כי supplement בלי הבנת ה-mechanism הוא רק יקר.",
      "מתכון בלי גלוטן ובלי לקטוז — לא נשמע טעים. 14 שנות תזונה קלינית הפכו את זה לאכיל ולמשתלם.",
      "הקורס שלי לא מלמד לבשל. הוא מלמד לקרוא חומרי גלם — ולהבין מה הגוף מרגיש 2 שעות אחרי.",
    ],
    lostDealMoments: [
      "עוקבת אמרה: 'יש YouTube בחינם, למה לשלם?'. לא הצלחתי להסביר מה ההבדל בין תוכן לבין קורס מובנה.",
      "שאלו 'יש preview של הקורס לפני קנייה?'. לא היה. 'לא קונים חתול בשק'.",
      "הלכו לקורס של influencer עם 200K עוקבים — 'נראה יותר מוכח'.",
    ],
    formData: baseFormData({
      businessName: "Cooking with Maya",
      industry: "Food creator + קורס דיגיטלי",
      targetMarket: "b2c_creator",
      currentPositioning: "מתכונים בריאים שאף אחד לא מסביר נכון",
      topCompetitors: ["Goop", "Yair Recipe", "Yelena Lifestyle"],
      priceRange: "budget",
      decisionSpeed: "impulse",
      claimExamples: [
        { claim: "80K עוקבים", evidence: "Instagram analytics", verified: true, gap: "" },
        { claim: "מתכונים בלי גלוטן ובלי לקטוז", evidence: "כל הספר", verified: true, gap: "" },
      ],
      hiddenValues: [
        { valueId: "narrative", score: 5, signal: "" },
        { valueId: "belonging", score: 4, signal: "" },
      ],
    }),
  },
  {
    id: "p14",
    archetype: "מורה אונליין, מוכר 4 קורסים, ממיר נמוך",
    segment: "b2c_creator",
    expectedFailureMode: "יותר מדי הצעות → engine ידחוס משפט שלא מבחין ביניהן",
    linkedinPosts: [
      "כל קורס שלי נגמר עם project שאפשר לשים ב-GitHub. לא תרגיל — אתר שעובד.",
      "לימדתי תכנות ל-1,200 אנשים. מה שגרם לרובם לעצור: לא קושי — חוסר context למה זה רלוונטי. אני מסביר context לפני syntax.",
      "קורס בעברית פשוטה לא אומר קורס פשטני. אומר שלא תבזבז 20% מהאנרגיה על תרגום בראש.",
    ],
    lostDealMoments: [
      "שאלו 'מה ההבדל בין 4 הקורסים שלך?' — לא הצלחתי לנסח תשובה ב-30 שניות. 'לא ברור לנו מה לקנות'.",
      "הלכו ל-Udemy כי 'יותר זול ועם certificate מוכר'.",
      "אמרו 'יש YouTube tutorials בחינם — נתחיל עם זה'.",
    ],
    formData: baseFormData({
      businessName: "Yossi Codes",
      industry: "קורסי תכנות אונליין",
      targetMarket: "b2c_creator",
      currentPositioning: "תכנות מאפס בעברית פשוטה",
      topCompetitors: ["Codecademy", "Udemy", "מורים פרטיים", "YouTube"],
      priceRange: "mid",
      claimExamples: [
        { claim: "בעברית", evidence: "כל הוידאו והקוד", verified: true, gap: "" },
        { claim: "פרויקט אמיתי", evidence: "כל קורס נגמר באתר", verified: true, gap: "" },
      ],
      lostDealReason: "לא ברור מה ההבדל בין הקורסים",
      hiddenValues: [{ valueId: "cognitive_ease", score: 5, signal: "" }],
    }),
  },

  // ── 3× edge cases ──
  {
    id: "p15",
    archetype: "סקפטי כלפי AI — חושב שכל מה ש-LLM יחזיר זה bullshit",
    segment: "edge_case",
    bias: "skeptic_of_ai",
    expectedFailureMode: "ידחה את ה-oneLiner לא משנה כמה הוא טוב",
    linkedinPosts: [
      "סורק AI לא מוצא zero-day. מומחה ב-20 שעות של עבודה ידנית — כן. זה ההבדל שאנחנו מוכרים.",
      "OSCP certification אינו title. הוא הוכחה שמישהו שבר מערכת אמיתית — לא רק תיאר תקיפה בתיאוריה.",
      "לקוח שאל: 'למה לא pentesting AI?'. כי ה-attacker שתתמודד איתו הוא אנושי — ויצירתי.",
    ],
    lostDealMoments: [
      "הציעו כלי automated ב-1/5 מהמחיר. 'AI פנטסטינג מספיק לנו לrequirements הביטוח'.",
      "שאלו אם יש integrations אוטומטיות ל-CI pipeline שלהם. לא — הכל ידני. 'זה bottleneck בתהליך שלנו'.",
      "הלכו עם bug bounty platform כי 'שלמים רק אם מוצאים — zero risk'.",
    ],
    formData: baseFormData({
      businessName: "BetaSec",
      industry: "אבטחת סייבר לעסקים בינוניים",
      targetMarket: "b2b_smb",
      companySize: "2-10",
      currentPositioning: "מבדקי חדירה ידניים, לא אוטומטיים",
      topCompetitors: ["סורקי AI", "סוכנויות סייבר גדולות", "Bug bounty"],
      priceRange: "premium",
      claimExamples: [
        { claim: "ידני בלבד", evidence: "20 שעות מומחה לבדיקה", verified: true, gap: "" },
        { claim: "OSCP-certified", evidence: "תעודות הצוות", verified: true, gap: "" },
      ],
      customerQuote: "אני לא רוצה שסקריפט יבדוק לי את הרשת",
      hiddenValues: [
        { valueId: "legitimacy", score: 5, signal: "" },
        { valueId: "risk", score: 5, signal: "" },
      ],
    }),
  },
  {
    id: "p16",
    archetype: "מוצף — מילא את השאלון ב-3 דקות, רוב התשובות שטחיות",
    segment: "edge_case",
    bias: "overload",
    expectedFailureMode: "קלטים דלים → engine יחזיר משפט פושטני",
    linkedinPosts: [
      "זמין ב-24 שעות. כי צנרת שפורצת ב-2 בלילה לא מחכה.",
      "30 שנה בשכונה. אני מכיר את הצנרת של 60% מהבניינים ברחוב.",
    ],
    lostDealMoments: [
      "הציעו ב-200 שקל פחות. הלכו.",
      "שאלו אם יש ערבות בכתב לעבודה. לא נתתי.",
    ],
    formData: baseFormData({
      businessName: "Avi Plumbing",
      industry: "אינסטלציה",
      targetMarket: "b2c_service",
      currentPositioning: "אינסטלטור",
      topCompetitors: ["אינסטלטורים אחרים"],
      priceRange: "mid",
      claimExamples: [
        { claim: "מהיר", evidence: "", verified: false, gap: "" },
      ],
      customerQuote: "טוב",
      lostDealReason: "מחיר",
      hiddenValues: [],
    }),
  },
  {
    id: "p17",
    archetype: "מזלזל בשיווק — 'אני לא צריך משפט בידול, יש לי לקוחות'",
    segment: "edge_case",
    bias: "dunning_kruger",
    expectedFailureMode: "ה-ownership prompt יחזיר feels_mine=false כי האדם לא מאמין במהלך",
    linkedinPosts: [
      "30 שנה במקום. אני מכיר את הרכב של הלקוחות לפני שהם מספרים מה הבעיה.",
      "לקוחות לא חוזרים כי זול. הם חוזרים כי יודעים מה יקבלו.",
    ],
    lostDealMoments: [
      "מישהו הציע שנתיים אחריות מלאה על כל עבודה. אני לא נותן — ולא מסוגל להסביר למה.",
      "שאלו אם עושים מכוניות חשמליות ו-hybrids חדשים. עדיין לא. 'אז אנחנו צריכים מישהו שמכיר EV'.",
    ],
    formData: baseFormData({
      businessName: "Cohen Garage",
      industry: "מוסך לרכבים פרטיים",
      targetMarket: "b2c_service",
      companySize: "2-10",
      currentPositioning: "מוסך משפחתי 30 שנה במקום",
      topCompetitors: ["מוסכים מורשי יצרן", "מוסכים זולים"],
      priceRange: "mid",
      claimExamples: [
        { claim: "30 שנה במקום", evidence: "", verified: true, gap: "" },
        { claim: "לקוחות חוזרים", evidence: "85% מהלקוחות חוזרים", verified: true, gap: "" },
      ],
      customerQuote: "אצל כהן יודעים את הרכב שלי",
      hiddenValues: [
        { valueId: "narrative", score: 5, signal: "" },
        { valueId: "empathy", score: 5, signal: "" },
      ],
    }),
  },

  // ── 3× failure states ──
  {
    id: "p18",
    archetype: "קהל יעד לא ברור — מוכרת ל-'כל מי שצריך'",
    segment: "failure_state",
    expectedFailureMode: "engine יחזיר משפט נטול ICP",
    linkedinPosts: [
      "עזרתי ל-30 עסקים השנה. לא כולם באותו תחום. כולם עם אותה בעיה: יודעים מה לעשות, לא עושים.",
      "ייעוץ עסקי לא אמור להיות יקר. הוא אמור להיות משתלם.",
    ],
    lostDealMoments: [
      "שאלו: 'יש לך ניסיון ספציפי בנדל\"ן מסחרי?'. לא. 'אנחנו צריכים מישהו שמכיר את הסקטור'.",
      "אמרו שעדיפים לגייס מנהל פנים-חברתי ב-15K. 'אז לפחות זה full-time'.",
    ],
    formData: baseFormData({
      businessName: "Lior Helps",
      industry: "ייעוץ עסקי כללי",
      targetMarket: "both",
      currentPositioning: "אני עוזרת לעסקים לגדול",
      topCompetitors: ["יועצים אחרים"],
      priceRange: "mid",
      claimExamples: [
        { claim: "ניסיון רב", evidence: "", verified: false, gap: "" },
      ],
      customerQuote: "ליאור עזרה לי",
      hiddenValues: [{ valueId: "empathy", score: 4, signal: "" }],
    }),
  },
  {
    id: "p19",
    archetype: "תחרות מחיר — כל המתחרים זולים יותר",
    segment: "failure_state",
    expectedFailureMode: "אין tradeoff מובנה → engine יציע 'איכות' (גנרי)",
    linkedinPosts: [
      "כל מנה מוכנה ביום האירוע. לא 3 ימים לפני. לא frozen. ביום.",
      "40 אירועים ב-2025. ממוצע: 8 שולחנות, 60 איש. לא עושים 500 איש — בכוונה.",
    ],
    lostDealMoments: [
      "מתחרה הציע ב-40% פחות. 'האיכות שלהם מספיק טובה לנו'. לא ידעתי מה להגיד.",
      "שאלו אם עושים חתונות של 200 איש. לא — הלכו למי שכן.",
    ],
    formData: baseFormData({
      businessName: "Tasty Catering",
      industry: "קייטרינג לאירועים פרטיים",
      targetMarket: "b2c_service",
      companySize: "2-10",
      currentPositioning: "קייטרינג איכותי לאירועים קטנים",
      topCompetitors: ["קייטרינג זול", "מסעדות עם משלוחים", "DIY"],
      priceRange: "premium",
      claimExamples: [
        { claim: "מנות בעבודת יד", evidence: "כל מנה מוכנה ביום האירוע", verified: true, gap: "" },
        { claim: "חומרי גלם premium", evidence: "ספקים ספציפיים", verified: true, gap: "" },
      ],
      lostDealReason: "מחיר — מתחרה ב-40% פחות",
      negativeReviewTheme: "יקר",
      hiddenValues: [{ valueId: "aesthetic", score: 5, signal: "" }],
    }),
  },
  {
    id: "p20",
    archetype: "תלות בהמלצות — כל הלקוחות מ-WhatsApp word-of-mouth",
    segment: "failure_state",
    expectedFailureMode: "אין discovery channel ברור → engine לא ידע איפה המשפט יופעל",
    linkedinPosts: [
      "12 שנים. ידיים שיודעות מה הן עושות. לא צריך יותר מזה.",
      "לקוחות שולחות חברות. זה לא שיווק — זה עדות.",
    ],
    lostDealMoments: [
      "לקוחה הלכה לסלון שיש לו 'מותג על אינסטגרם ונראה מקצועי'. לא היה לי כלום באינסטגרם.",
      "שאלה אם עושה קיריטין. לא. 'אז נמשיך לחפש'.",
    ],
    formData: baseFormData({
      businessName: "Rachel Hairdresser",
      industry: "מספרת ביתית",
      targetMarket: "b2c_service",
      currentPositioning: "מספרת ביתית עם 12 שנות ניסיון",
      topCompetitors: ["סלוני יוקרה", "מספרות שכונה", "מעצבי שיער עצמאיים"],
      priceRange: "mid",
      decisionSpeed: "days",
      discoveryChannels: ["המלצות"],
      claimExamples: [
        { claim: "צבע מומחית", evidence: "12 שנים", verified: true, gap: "" },
      ],
      customerQuote: "כולם הולכים לרחל",
      hiddenValues: [
        { valueId: "belonging", score: 5, signal: "" },
        { valueId: "empathy", score: 4, signal: "" },
      ],
    }),
  },
];

// Convenience export for harness
export function getPersonas(): SyntheticPersona[] {
  return personas;
}
