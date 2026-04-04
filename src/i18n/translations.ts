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
  fieldPersonalBrand: { he: "מיתוג אישי", en: "Personal Brand" },
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
  channelWhatsApp: { he: "וואטסאפ", en: "WhatsApp" },
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

  // Brand DNA Tab
  tabBrandDna: { he: "Brand DNA", en: "Brand DNA" },
  brandDnaSubtitle: { he: "כלי אבחון מיתוג אישי מבוסס מחקר – ציון בריאות מיצוב + תבניות ביצוע", en: "Research-based personal brand diagnostic – Positioning Health Score + execution templates" },

  // Neuro-Storytelling Tab
  tabNeuroStory: { he: "Neuro-Story", en: "Neuro-Story" },
  neuroSubtitle: { he: "כלי נוירו-סטוריטלינג מבוססי מחקר – 3 וקטורים ביוכימיים, תבניות Neuro-Prompt וניהול אנטרופיה", en: "Research-based neuro-storytelling tools – 3 biochemical vectors, Neuro-Prompt templates, and entropy management" },
  neuroAxiom: { he: "האקסיומה של כוח המשיכה הנרטיבי הוקטורי", en: "The Axiom of Vectorial Narrative Gravity" },
  neuroVectors: { he: "3 הוקטורים הביוכימיים", en: "The 3 Biochemical Vectors" },
  neuroBioFunction: { he: "פונקציה ביולוגית", en: "Biological Function" },
  neuroCopyApp: { he: "יישום בקופי", en: "Copy Application" },
  neuroTips: { he: "טיפים לעוצמה", en: "Intensity Tips" },
  neuroPromptGenerator: { he: "גנרטור Neuro-Prompt", en: "Neuro-Prompt Generator" },
  neuroPromptDesc: { he: "בחר שלב במשפך לקבלת תבנית Neuro-Prompt מותאמת עם סימוני וקטורים", en: "Select a funnel stage to get a tailored Neuro-Prompt template with vector markers" },
  neuroEntropy: { he: "מד איזון אנטרופיה", en: "Entropy Balance Meter" },
  neuroOverload: { he: "עומס אנטרופי", en: "Entropic Overload" },
  neuroCollapse: { he: "קריסת אנטרופיה", en: "Entropy Collapse" },
  neuroSweetSpot: { he: "Sweet Spot", en: "Sweet Spot" },
  neuroOverloadSigns: { he: "סימני עומס", en: "Overload Signs" },
  neuroCollapseSigns: { he: "סימני קריסה", en: "Collapse Signs" },
  neuroBalanceTips: { he: "טיפים לאיזון", en: "Balance Tips" },

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
  copyTemplate: { he: "העתק תבנית", en: "Copy Template" },
  templateCopied: { he: "התבנית הועתקה!", en: "Template copied!" },

  // Accessibility
  skipToContent: { he: "דלג לתוכן", en: "Skip to content" },

  // Adaptive Tabs (legacy — used as section labels inside merged tabs)
  tabMonitor: { he: "ניטור", en: "Monitor" },
  tabData: { he: "נתונים", en: "Data" },

  // Consolidated Tabs
  tabPlanning: { he: "תכנון", en: "Planning" },
  tabContent: { he: "תוכן", en: "Content" },
  tabAnalytics: { he: "אנליטיקס", en: "Analytics" },
  contentSubNavHooks: { he: "הוקים", en: "Hooks" },
  contentSubNavCopyLab: { he: "Copy Lab", en: "Copy Lab" },
  contentSubNavNeuro: { he: "Neuro-Story", en: "Neuro-Story" },
  analyticsMonitorSection: { he: "ניטור ביצועים", en: "Performance Monitoring" },
  analyticsDataSection: { he: "ניתוח נתונים", en: "Data Analysis" },

  // Israeli Tool Recommendations
  israeliToolsTitle: { he: "כלים ישראליים מומלצים לביצוע", en: "Recommended Israeli Tools for Execution" },
  israeliToolsSubtitle: {
    he: "FunnelForge בונה את האסטרטגיה – הכלים האלה מבצעים אותה. כולם ישראליים.",
    en: "FunnelForge builds the strategy – these tools execute it. All Israeli-made.",
  },
  israeliToolWhy: { he: "למה?", en: "Why?" },
  israeliToolPricing: { he: "תמחור", en: "Pricing" },

  // Israeli Industry Benchmarks
  industryBenchmarkTitle: { he: "בנצ'מרק ישראלי לפי תעשייה", en: "Israeli Industry Benchmarks" },
  industryBenchmarkSubtitle: {
    he: "מדדים ממוצעים לתעשייה שלך בשוק הישראלי",
    en: "Average metrics for your industry in the Israeli market",
  },
  benchmarkAvg: { he: "ממוצע בענף", en: "Industry avg." },
  benchmarkYourTarget: { he: "היעד שלך", en: "Your target" },

  // Beginner simplified views
  beginnerHooksTitle: { he: "3 טריגרים פסיכולוגיים שעובדים", en: "3 Psychological Triggers That Work" },
  beginnerHooksSubtitle: { he: "הנוסחאות הכי פשוטות ללכידת קשב – בלי ז'רגון", en: "The simplest attention-grabbing formulas – no jargon" },
  beginnerCopyLabTitle: { he: "2 נוסחאות כתיבה קלאסיות", en: "2 Classic Writing Formulas" },
  beginnerCopyLabSubtitle: { he: "התחל עם הנוסחאות הכי מוכחות – PAS ו-AIDA", en: "Start with the most proven formulas – PAS & AIDA" },
  beginnerNeuroTitle: { he: "3 רגשות שמניעים החלטות", en: "3 Emotions That Drive Decisions" },
  beginnerNeuroSubtitle: { he: "מתח, אמון ותגמול – שלושת הכוחות מאחורי כל רכישה", en: "Tension, trust & reward – the three forces behind every purchase" },
  beginnerMonitorTitle: { he: "ניטור ביצועים", en: "Performance Monitoring" },
  beginnerMonitorSubtitle: { he: "חבר את חשבון Meta Ads שלך כדי לעקוב אחרי ביצועי הקמפיינים בזמן אמת", en: "Connect your Meta Ads account to track campaign performance in real time" },
  unlockFullView: { he: "רוצה לראות את הגרסה המלאה? שנה רמת ניסיון ל\"בינוני\" או \"מתקדם\"", en: "Want the full version? Change experience level to \"Intermediate\" or \"Advanced\"" },

  // Stylome Extractor
  tabStylome: { he: "טביעת סגנון", en: "Stylome" },
  stylomeSubtitle: { he: "מחלץ טביעת סגנון אישית — הדבק דגימות כתיבה וקבל System Prompt לשכפול הקול שלך", en: "Personal style fingerprint — paste writing samples and get a System Prompt to clone your voice" },
  beginnerStylomeTitle: { he: "מחלץ טביעת סגנון", en: "Style Fingerprint" },
  beginnerStylomeSubtitle: { he: "הדבק טקסטים שכתבת (וואטסאפ, אימייל, פוסט) וקבל פרומפט AI שכותב כמוך", en: "Paste texts you've written (WhatsApp, email, post) and get an AI prompt that writes like you" },
} as const;

export type TranslationKey = keyof typeof translations;
