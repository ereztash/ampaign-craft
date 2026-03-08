export type Language = "he" | "en";

export const translations = {
  // Header
  appName: { he: "FunnelForge", en: "FunnelForge" },
  appTagline: {
    he: "בנה את המשפך השיווקי המושלם לעסק שלך",
    en: "Build the perfect marketing funnel for your business",
  },

  // Landing
  heroTitle: {
    he: "תכנן את המשפך השיווקי שלך בדקות",
    en: "Plan Your Marketing Funnel in Minutes",
  },
  heroSubtitle: {
    he: "מערכת חכמה שמנתחת את העסק שלך ובונה תוכנית שיווק מותאמת אישית",
    en: "A smart system that analyzes your business and builds a personalized marketing plan",
  },
  ctaButton: { he: "בנה את המשפך שלך", en: "Build Your Funnel" },
  featureAnalyze: { he: "נתח", en: "Analyze" },
  featureAnalyzeDesc: {
    he: "הזן את פרטי העסק שלך ואנחנו ננתח את השוק",
    en: "Enter your business details and we'll analyze the market",
  },
  featurePlan: { he: "תכנן", en: "Plan" },
  featurePlanDesc: {
    he: "קבל משפך שיווקי מותאם אישית עם אסטרטגיה מפורטת",
    en: "Get a customized marketing funnel with a detailed strategy",
  },
  featureExecute: { he: "בצע", en: "Execute" },
  featureExecuteDesc: {
    he: "יישם את התוכנית עם המלצות ערוצים, תקציב ומדדים",
    en: "Execute the plan with channel recommendations, budget, and KPIs",
  },

  // Form Steps
  step: { he: "שלב", en: "Step" },
  of: { he: "מתוך", en: "of" },
  next: { he: "הבא", en: "Next" },
  back: { he: "חזור", en: "Back" },
  skip: { he: "דלג", en: "Skip" },
  generateFunnel: { he: "צור משפך", en: "Generate Funnel" },

  // Step 1 - Business Field
  step1Title: { he: "מה תחום העסק שלך?", en: "What is your business field?" },
  step1Subtitle: {
    he: "בחר את התחום שהכי מתאים לעסק שלך",
    en: "Select the field that best fits your business",
  },
  fieldFashion: { he: "אופנה ויופי", en: "Fashion & Beauty" },
  fieldTech: { he: "טכנולוגיה", en: "Technology" },
  fieldFood: { he: "מזון ומשקאות", en: "Food & Beverage" },
  fieldServices: { he: "שירותים מקצועיים", en: "Professional Services" },
  fieldEducation: { he: "חינוך", en: "Education" },
  fieldHealth: { he: "בריאות וכושר", en: "Health & Fitness" },
  fieldRealEstate: { he: "נדל\"ן", en: "Real Estate" },
  fieldTourism: { he: "תיירות ופנאי", en: "Tourism & Leisure" },
  fieldOther: { he: "אחר", en: "Other" },

  // Step 2 - Target Audience
  step2Title: { he: "מיהו קהל היעד שלך?", en: "Who is your target audience?" },
  step2Subtitle: {
    he: "ספר לנו על הלקוחות שלך",
    en: "Tell us about your customers",
  },
  audienceType: { he: "סוג קהל", en: "Audience Type" },
  b2c: { he: "צרכנים (B2C)", en: "Consumers (B2C)" },
  b2b: { he: "עסקים (B2B)", en: "Businesses (B2B)" },
  both: { he: "גם וגם", en: "Both" },
  ageRange: { he: "טווח גילאים", en: "Age Range" },
  interests: { he: "תחומי עניין (מילות מפתח)", en: "Interests (keywords)" },
  interestsPlaceholder: {
    he: "למשל: ספורט, טכנולוגיה, אוכל",
    en: "e.g., sports, technology, food",
  },

  // Step 3 - Product/Service
  step3Title: { he: "מה המוצר או השירות שלך?", en: "What is your product or service?" },
  step3Subtitle: {
    he: "תאר בקצרה את מה שאתה מציע",
    en: "Briefly describe what you offer",
  },
  productDescription: { he: "תיאור קצר", en: "Short description" },
  productDescPlaceholder: {
    he: "למשל: קרם פנים אורגני לנשים",
    en: "e.g., Organic face cream for women",
  },
  averagePrice: { he: "מחיר ממוצע (₪)", en: "Average price (₪)" },
  salesModel: { he: "מודל מכירה", en: "Sales Model" },
  oneTime: { he: "חד-פעמי", en: "One-time" },
  subscription: { he: "מנוי", en: "Subscription" },
  leads: { he: "לידים", en: "Leads" },

  // Step 4 - Budget
  step4Title: { he: "מה תקציב השיווק החודשי שלך?", en: "What is your monthly marketing budget?" },
  step4Subtitle: {
    he: "בחר את הטווח המתאים",
    en: "Select the appropriate range",
  },
  budgetLow: { he: "פחות מ-₪2,000", en: "Under ₪2,000" },
  budgetMedium: { he: "₪2,000 – ₪10,000", en: "₪2,000 – ₪10,000" },
  budgetHigh: { he: "₪10,000 – ₪50,000", en: "₪10,000 – ₪50,000" },
  budgetVeryHigh: { he: "מעל ₪50,000", en: "Over ₪50,000" },

  // Step 5 - Goal
  step5Title: { he: "מה המטרה העיקרית שלך?", en: "What is your main goal?" },
  step5Subtitle: {
    he: "בחר את המטרה שהכי חשובה לך עכשיו",
    en: "Choose the goal most important to you right now",
  },
  goalAwareness: { he: "מודעות למותג", en: "Brand Awareness" },
  goalLeads: { he: "יצירת לידים", en: "Lead Generation" },
  goalSales: { he: "מכירות", en: "Sales" },
  goalLoyalty: { he: "נאמנות ושימור", en: "Loyalty & Retention" },

  // Step 6 - Channels
  step6Title: { he: "אילו ערוצים יש לך כיום?", en: "Which channels do you currently use?" },
  step6Subtitle: {
    he: "סמן את כל הערוצים הקיימים שלך (אופציונלי)",
    en: "Check all your existing channels (optional)",
  },
  channelFacebook: { he: "פייסבוק", en: "Facebook" },
  channelInstagram: { he: "אינסטגרם", en: "Instagram" },
  channelGoogle: { he: "גוגל", en: "Google" },
  channelContent: { he: "תוכן (בלוג)", en: "Content (Blog)" },
  channelEmail: { he: "אימייל", en: "Email" },
  channelTikTok: { he: "טיקטוק", en: "TikTok" },
  channelLinkedIn: { he: "לינקדאין", en: "LinkedIn" },
  channelOther: { he: "אחר", en: "Other" },

  // Step 7 - Experience
  step7Title: { he: "מה רמת הניסיון שלך בשיווק?", en: "What is your marketing experience level?" },
  step7Subtitle: {
    he: "זה יעזור לנו להתאים את ההמלצות",
    en: "This will help us tailor the recommendations",
  },
  expBeginner: { he: "מתחיל", en: "Beginner" },
  expBeginnerDesc: {
    he: "אין לי ניסיון משמעותי בשיווק דיגיטלי",
    en: "I have no significant digital marketing experience",
  },
  expIntermediate: { he: "בינוני", en: "Intermediate" },
  expIntermediateDesc: {
    he: "יש לי ניסיון בסיסי עם מספר ערוצים",
    en: "I have basic experience with several channels",
  },
  expAdvanced: { he: "מתקדם", en: "Advanced" },
  expAdvancedDesc: {
    he: "יש לי ניסיון רב ואני מכיר כלים מתקדמים",
    en: "I have extensive experience and know advanced tools",
  },

  // Processing
  processingTitle: { he: "מרכיבים את המשפך שלך...", en: "Building your funnel..." },
  processingStep1: { he: "מנתחים את השוק שלך...", en: "Analyzing your market..." },
  processingStep2: { he: "בוחרים ערוצים מתאימים...", en: "Selecting suitable channels..." },
  processingStep3: { he: "מחשבים תקציב אופטימלי...", en: "Calculating optimal budget..." },
  processingStep4: { he: "בונים את המשפך המושלם!", en: "Building the perfect funnel!" },

  // Results
  resultsTitle: { he: "המשפך השיווקי שלך", en: "Your Marketing Funnel" },
  resultsSubtitle: {
    he: "תוכנית שיווק מותאמת אישית לעסק שלך",
    en: "A personalized marketing plan for your business",
  },
  tabStrategy: { he: "אסטרטגיה", en: "Strategy" },
  tabBudget: { he: "תקציב", en: "Budget" },
  tabKpis: { he: "מדדים", en: "KPIs" },
  tabTips: { he: "טיפים", en: "Tips" },
  tabHooks: { he: "הוקים התנהגותיים", en: "Content Hooks" },
  hooksSubtitle: { he: "נוסחאות כתיבה מבוססות מדע התנהגותי ללכידת קשב", en: "Behavioral science-based writing formulas for capturing attention" },
  hookFormula: { he: "נוסחה", en: "Formula" },
  hookExample: { he: "דוגמה", en: "Example" },
  hookChannels: { he: "מתאים ל", en: "Best for" },
  tabCopyLab: { he: "Copy Lab", en: "Copy Lab" },
  copyLabSubtitle: { he: "כלי כתיבה מבוססי נוירוקופירייטינג, נוסחאות היסטוריות ו-Meta-Cognitive Framework", en: "Writing tools based on neurocopywriting, historical formulas, and Meta-Cognitive Framework" },
  readerProfile: { he: "פרופיל קורא", en: "Reader Profile" },
  copyArchitecture: { he: "ארכיטקטורת קופי", en: "Copy Architecture" },
  effectivePrinciples: { he: "עקרונות אפקטיביים", en: "Effective Principles" },
  copyFormulas: { he: "נוסחאות כתיבה", en: "Copy Formulas" },
  writingTechniques: { he: "טכניקות כתיבה", en: "Writing Techniques" },
  formulaOrigin: { he: "מקור", en: "Origin" },
  formulaStructure: { he: "מבנה", en: "Structure" },
  formulaBestFor: { he: "הכי טוב ל", en: "Best for" },
  doThis: { he: "✅ עשה", en: "✅ Do this" },
  dontDoThis: { he: "❌ לא ככה", en: "❌ Not like this" },

  // Funnel Stages
  stageAwareness: { he: "מודעות", en: "Awareness" },
  stageEngagement: { he: "מעורבות", en: "Engagement" },
  stageLeads: { he: "לידים", en: "Leads" },
  stageConversion: { he: "המרה", en: "Conversion" },
  stageRetention: { he: "שימור", en: "Retention" },

  // Results Actions
  editPlan: { he: "ערוך תוכנית", en: "Edit Plan" },
  exportPdf: { he: "ייצא PDF", en: "Export PDF" },
  savePlan: { he: "שמור תוכנית", en: "Save Plan" },
  sharePlan: { he: "שתף", en: "Share" },
  newPlan: { he: "תוכנית חדשה", en: "New Plan" },

  // Results Details
  recommendedChannels: { he: "ערוצים מומלצים", en: "Recommended Channels" },
  budgetAllocation: { he: "חלוקת תקציב", en: "Budget Allocation" },
  keyMetrics: { he: "מדדי הצלחה", en: "Key Metrics" },
  personalizedTips: { he: "טיפים מותאמים", en: "Personalized Tips" },
  funnelName: { he: "שם המשפך", en: "Funnel Name" },
  estimatedBudget: { he: "תקציב מוערך", en: "Estimated Budget" },
  perMonth: { he: "לחודש", en: "/month" },

  // Disclaimer
  disclaimer: {
    he: "⚠️ המלצות אלו מבוססות על כללי שיווק מקובלים ואינן מהוות ייעוץ מקצועי. התקציב המומלץ הוא הערכה בלבד.",
    en: "⚠️ These recommendations are based on established marketing principles and do not constitute professional advice. The suggested budget is an estimate only.",
  },

  // Saved Plans
  savedPlans: { he: "תוכניות שמורות", en: "Saved Plans" },
  noSavedPlans: { he: "אין תוכניות שמורות", en: "No saved plans" },
  planSaved: { he: "התוכנית נשמרה!", en: "Plan saved!" },
  planDeleted: { he: "התוכנית נמחקה", en: "Plan deleted" },
  comparePlans: { he: "השווה תוכניות", en: "Compare Plans" },
} as const;

export type TranslationKey = keyof typeof translations;
