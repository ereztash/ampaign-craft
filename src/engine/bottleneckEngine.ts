/**
 * Bottleneck detection across the 5-module cycle.
 * Pure logic — composes health score and business signals into prioritized issues.
 */

import { FunnelResult } from "@/types/funnel";

export type BottleneckModule = "differentiation" | "marketing" | "sales" | "pricing" | "retention";
export type BottleneckSeverity = "critical" | "warning" | "info";

export interface Bottleneck {
  id: string;
  module: BottleneckModule;
  severity: BottleneckSeverity;
  title: { he: string; en: string };
  description: { he: string; en: string };
  tactics: { he: string; en: string }[];
}

export interface BottleneckInput {
  funnelResult: FunnelResult | null;
  hasDifferentiation: boolean;
  planCount: number;
  connectedSources: number;
  healthScoreTotal: number | null;
}

export function detectBottlenecks(input: BottleneckInput): Bottleneck[] {
  const { funnelResult, hasDifferentiation, planCount, connectedSources, healthScoreTotal } = input;
  const out: Bottleneck[] = [];

  if (!hasDifferentiation) {
    out.push({
      id: "diff-missing",
      module: "differentiation",
      severity: planCount > 0 ? "warning" : "info",
      title: { he: "חסר בידול מפורש", en: "Differentiation not completed" },
      description: {
        he: "ללא בידול, סקריפטי מכירה והוקים פחות מדויקים לעסק שלך.",
        en: "Without differentiation, sales scripts and hooks are less specific to your business.",
      },
      tactics: [
        { he: "השלם את אשף הבידול (10 דק׳)", en: "Complete the differentiation wizard (~10 min)" },
        { he: "מפו מתחרים וערך נסתר", en: "Map competitors and hidden value" },
      ],
    });
  }

  if (planCount === 0) {
    out.push({
      id: "no-plan",
      module: "marketing",
      severity: "critical",
      title: { he: "אין תוכנית שיווק שנוצרה", en: "No marketing plan generated" },
      description: {
        he: "בלי תוכנית משפך אין בסיס למדדי ביצועים והקצאת תקציב.",
        en: "Without a funnel plan there is no baseline for KPIs and budget allocation.",
      },
      tactics: [
        { he: "צור תוכנית מהירה או מודרכת", en: "Run express or guided wizard" },
        { he: "חבר מקור נתונים לשיפור ההמלצות", en: "Connect a data source to sharpen recommendations" },
      ],
    });
  }

  if (funnelResult) {
    const { formData } = funnelResult;
    if (formData.existingChannels.length < 2) {
      out.push({
        id: "mkt-channels",
        module: "marketing",
        severity: "warning",
        title: { he: "מעט ערוצי שיווק מוגדרים", en: "Few marketing channels defined" },
        description: {
          he: "מגוון נמוך מגביר תלות בערוץ בודד וסיכון לפערים במשפך.",
          en: "Low channel diversity increases single-channel dependency and funnel gaps.",
        },
        tactics: [
          { he: "הוסף אימייל או וואטסאפ לפי קהל", en: "Add email or WhatsApp based on audience" },
          { he: "בדוק הקצאת תקציב בין שלבי המשפך", en: "Review budget split across funnel stages" },
        ],
      });
    }

    if (healthScoreTotal !== null && healthScoreTotal < 50) {
      out.push({
        id: "mkt-health",
        module: "marketing",
        severity: healthScoreTotal < 35 ? "critical" : "warning",
        title: { he: "ציון בריאות שיווקית נמוך", en: "Low marketing health score" },
        description: {
          he: "הגדרות המשפך חסרות או חלקיות — יש מקום לחיזוק מהיר.",
          en: "Funnel inputs are incomplete — quick wins available.",
        },
        tactics: [
          { he: "השלם תיאור מוצר ומטרה עיקרית", en: "Complete product description and main goal" },
          { he: "עדכן תקציב ומודל מכירה", en: "Update budget range and sales model" },
        ],
      });
    }
  }

  if (connectedSources === 0 && planCount > 0) {
    out.push({
      id: "data-velocity",
      module: "marketing",
      severity: "info",
      title: { he: "אין מקורות נתונים מחוברים", en: "No connected data sources" },
      description: {
        he: "חיבור נתונים יאפשר תובנות עדכניות והתאמות קמפיין.",
        en: "Connecting data enables fresher insights and campaign tuning.",
      },
      tactics: [
        { he: "ייבא CSV או חבר מטא", en: "Import CSV or connect Meta" },
        { he: "מלא פרופיל עסק כמקור הקשר", en: "Fill business profile as context source" },
      ],
    });
  }

  // Sales / pricing / retention heuristics when plan exists
  if (funnelResult && hasDifferentiation && funnelResult.formData.averagePrice <= 0) {
    out.push({
      id: "price-missing",
      module: "pricing",
      severity: "warning",
      title: { he: "מחיר ממוצע לא הוגדר", en: "Average price not set" },
      description: {
        he: "תמחור והצעות תלויים במספרים ריאליים.",
        en: "Pricing and offer stacks need realistic numbers.",
      },
      tactics: [
        { he: "עדכן מחיר ממוצע בשאלון", en: "Update average price in questionnaire" },
        { he: "בדוק מבנה מדרגות מחיר", en: "Review tier structure in strategy canvas" },
      ],
    });
  }

  const formData = funnelResult?.formData;
  if (funnelResult && formData && !formData.mainGoal) {
    out.push({
      id: "goal-missing",
      module: "retention",
      severity: "info",
      title: { he: "מטרת צמיחה לא הוגדרה", en: "Growth goal not set" },
      description: {
        he: "שימור וצמיחה תלויים במטרה ברורה (מודעות/לידים/מכירות).",
        en: "Retention strategy aligns to a clear goal (awareness/leads/sales).",
      },
      tactics: [
        { he: "בחר מטרה בשאלון", en: "Pick a main goal in the wizard" },
      ],
    });
  }

  const severityOrder: Record<BottleneckSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return out.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
