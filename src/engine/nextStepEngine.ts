// ═══════════════════════════════════════════════
// Next Step Engine — Adaptive navigation based on user state
// Determines the single most important action for the user right now
// ═══════════════════════════════════════════════

import { UserKnowledgeGraph } from "./userKnowledgeGraph";

export interface NextStep {
  id: string;
  title: { he: string; en: string };
  description: { he: string; en: string };
  route: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
  priority: number; // lower = more important
}

export function getRecommendedNextStep(
  graph: UserKnowledgeGraph,
  hasDiff: boolean,
  planCount: number,
  masteryFeatures: Set<string>,
): NextStep {
  // Priority 1: No differentiation yet → push differentiation
  if (!hasDiff) {
    return {
      id: "differentiation",
      title: { he: "גלה את הבידול שלך", en: "Discover Your Differentiation" },
      description: { he: "10 דקות שישנו את כל התוצאות — סקריפטים מדויקים ×3", en: "10 minutes that change all results — 3× more precise scripts" },
      route: "/differentiate",
      icon: "Crosshair",
      color: "text-amber-500",
      priority: 1,
    };
  }

  // Priority 2: Has differentiation but no plan → build plan
  if (planCount === 0) {
    return {
      id: "wizard",
      title: { he: "בנה תוכנית שיווק מותאמת", en: "Build Your Personalized Plan" },
      description: { he: "הבידול שלך מוכן — 2 דקות ותקבל תוכנית מלאה", en: "Your differentiation is ready — 2 minutes to a full plan" },
      route: "/wizard",
      icon: "Rocket",
      color: "text-primary",
      priority: 2,
    };
  }

  // Priority 3: Has plan but hasn't explored pricing → push pricing
  if (!masteryFeatures.has("pricing")) {
    return {
      id: "pricing",
      title: { he: "הגדר את התמחור שלך", en: "Set Your Pricing Strategy" },
      description: { he: "מבנה tiers, offer stack, ואחריות — מבוסס על דאטה ישראלי", en: "Tier structure, offer stack, guarantee — based on Israeli data" },
      route: "/plans",
      icon: "DollarSign",
      color: "text-emerald-500",
      priority: 3,
    };
  }

  // Priority 4: Has plan but hasn't explored retention → push retention
  if (!masteryFeatures.has("retention")) {
    return {
      id: "retention",
      title: { he: "תכנן שימור לקוחות", en: "Plan Customer Retention" },
      description: { he: "Onboarding, referral, churn prevention — תבניות WhatsApp מוכנות", en: "Onboarding, referral, churn prevention — ready WhatsApp templates" },
      route: "/plans",
      icon: "Heart",
      color: "text-pink-500",
      priority: 4,
    };
  }

  // Priority 5: Has plan but hasn't explored sales → push sales
  if (!masteryFeatures.has("sales")) {
    return {
      id: "sales",
      title: { he: "שפר את סקריפטי המכירה", en: "Improve Your Sales Scripts" },
      description: { he: "סקריפטים מותאמים עם שמות המתחרים שלך", en: "Personalized scripts with your competitor names" },
      route: "/plans",
      icon: "TrendingUp",
      color: "text-accent",
      priority: 5,
    };
  }

  // Default: Update existing plan
  return {
    id: "update",
    title: { he: "עדכן את התוכנית שלך", en: "Update Your Plan" },
    description: { he: "ייתכן שהשתנה משהו — בדוק ועדכן", en: "Things may have changed — check and update" },
    route: "/wizard",
    icon: "RefreshCw",
    color: "text-primary",
    priority: 10,
  };
}
