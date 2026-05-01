/**
 * Bottleneck detection across the 5-module cycle.
 * Pure logic — composes health score and business signals into prioritized issues.
 * Descriptions follow FOUND→MEANS→DO: neutral observation → business consequence → one action.
 * Each tactic has a structureLevel for Fading Scaffolding: full_example → skeleton → prompt_only.
 */

import { FunnelResult } from "@/types/funnel";

export type BottleneckModule = "differentiation" | "marketing" | "sales" | "pricing" | "retention";
export type BottleneckSeverity = "critical" | "warning" | "info";
export type TacticStructureLevel = "full_example" | "skeleton" | "prompt_only";

export interface BottleneckTactic {
  he: string;
  en: string;
  structureLevel: TacticStructureLevel;
}

export interface Bottleneck {
  id: string;
  module: BottleneckModule;
  severity: BottleneckSeverity;
  title: { he: string; en: string };
  description: { he: string; en: string };
  tactics: BottleneckTactic[];
  marketContext?: { he: string; en: string };
}

export interface BottleneckInput {
  funnelResult: FunnelResult | null;
  hasDifferentiation: boolean;
  planCount: number;
  connectedSources: number;
  healthScoreTotal: number | null;
}

export function selectTactic(
  tactics: BottleneckTactic[],
  usageCount: number,
): BottleneckTactic {
  const level: TacticStructureLevel =
    usageCount < 3 ? "full_example" : usageCount < 6 ? "skeleton" : "prompt_only";
  return tactics.find((t) => t.structureLevel === level) ?? tactics[0];
}

export function detectBottlenecks(input: BottleneckInput): Bottleneck[] {
  const { funnelResult, hasDifferentiation, planCount, connectedSources, healthScoreTotal } = input;
  const out: Bottleneck[] = [];

  if (!hasDifferentiation) {
    out.push({
      id: "diff-missing",
      module: "differentiation",
      severity: planCount > 0 ? "warning" : "info",
      title: { he: "אין משפט בידול כתוב", en: "No written differentiation statement" },
      description: {
        he: "ללא בידול כתוב, לקוח שמשווה מחירים אין לו סיבה לבחור בך. Copy ומשפך פחות מדויקים.",
        en: "Without a written differentiation, a price-comparing prospect has no reason to choose you. Copy and funnel lose precision.",
      },
      tactics: [
        {
          he: "השלם את אשף הבידול (10 דק'): ענה על שאלת 'למה אתה שונה, לא טוב יותר'.",
          en: "Complete the differentiation wizard (~10 min): answer 'why you're different, not just better'.",
          structureLevel: "full_example",
        },
        {
          he: "השלם אשף הבידול — תחל ב-'מנגנון' ו-'מה שאנחנו לא עושים'.",
          en: "Complete the differentiation wizard — start with 'mechanism' and 'what we consciously don't do'.",
          structureLevel: "skeleton",
        },
        {
          he: "רוצה תבנית לניסוח בידול?",
          en: "Want a template for your differentiation statement?",
          structureLevel: "prompt_only",
        },
      ],
      marketContext: {
        he: "60% מהעסקים בתחומך עדכנו את הבידול ב-12 החודשים האחרונים",
        en: "60% of businesses in your sector updated their differentiation in the past 12 months",
      },
    });
  }

  if (planCount === 0) {
    out.push({
      id: "no-plan",
      module: "marketing",
      severity: "critical",
      title: { he: "אין תוכנית שיווק", en: "No marketing plan" },
      description: {
        he: "בלי תוכנית משפך אין בסיס למדדים, ואין לאן להפנות תקציב. כל פעולה שיווקית היא ניחוש.",
        en: "Without a funnel plan there is no baseline for KPIs and no direction for budget. Every marketing action is a guess.",
      },
      tactics: [
        {
          he: "צור תוכנית מהירה (5 דק'): מלא תחום, קהל יעד, ותקציב חודשי — המערכת תייצר משפך.",
          en: "Run the express wizard (5 min): fill in field, audience, monthly budget — the system generates a funnel.",
          structureLevel: "full_example",
        },
        {
          he: "צור תוכנית: הכנס תחום + תקציב + מטרה עיקרית.",
          en: "Create a plan: enter field + budget + main goal.",
          structureLevel: "skeleton",
        },
        {
          he: "רוצה שניצור תוכנית שיווק ראשונה?",
          en: "Ready to create your first marketing plan?",
          structureLevel: "prompt_only",
        },
      ],
      marketContext: {
        he: "עסקים עם תוכנית שיווק כתובה צומחים פי 2 מהר יותר בממוצע",
        en: "Businesses with a written marketing plan grow 2x faster on average",
      },
    });
  }

  if (funnelResult) {
    const { formData } = funnelResult;

    if (formData.existingChannels.length < 2) {
      out.push({
        id: "mkt-channels",
        module: "marketing",
        severity: "warning",
        title: { he: "ערוץ שיווק יחיד", en: "Single marketing channel" },
        description: {
          he: "ערוץ אחד = נקודת כשל יחידה. כשהוא יירד בביצועים, אין גיבוי. הוסף ערוץ שני עם 20% מהתקציב.",
          en: "One channel = one failure point. When it drops in performance, there's no backup. Add a second channel with 20% of budget.",
        },
        tactics: [
          {
            he: "הוסף אימייל אם הקהל B2B, וואטסאפ אם B2C — חלק 20% מהתקציב לערוץ החדש ל-30 יום.",
            en: "Add email for B2B audiences, WhatsApp for B2C — allocate 20% of budget to the new channel for 30 days.",
            structureLevel: "full_example",
          },
          {
            he: "הוסף ערוץ שני: [אימייל / וואטסאפ / SEO] + הגדר תקציב חודשי.",
            en: "Add a second channel: [email / WhatsApp / SEO] + set monthly budget.",
            structureLevel: "skeleton",
          },
          {
            he: "איזה ערוץ שני מתאים לקהל שלך?",
            en: "Which second channel fits your audience?",
            structureLevel: "prompt_only",
          },
        ],
        marketContext: {
          he: "עסקים עם 3+ ערוצים פעילים מדווחים על 40% פחות תנודתיות בהכנסות",
          en: "Businesses with 3+ active channels report 40% less revenue volatility",
        },
      });
    }

    if (healthScoreTotal !== null && healthScoreTotal < 50) {
      out.push({
        id: "mkt-health",
        module: "marketing",
        severity: healthScoreTotal < 35 ? "critical" : "warning",
        title: { he: "ציון בריאות שיווקית נמוך", en: "Low marketing health score" },
        description: {
          he: `ציון ${healthScoreTotal}/100 מצביע על פערים בהגדרות המשפך. כל נקודה שחסרה מייצרת המלצות פחות מדויקות.`,
          en: `Score ${healthScoreTotal}/100 signals gaps in funnel inputs. Each missing input produces less precise recommendations.`,
        },
        tactics: [
          {
            he: "השלם תיאור מוצר (לפחות 30 מילה), הגדר מטרה עיקרית, ועדכן מחיר ממוצע — 3 שדות, 5 דק'.",
            en: "Complete product description (at least 30 words), set main goal, update average price — 3 fields, 5 minutes.",
            structureLevel: "full_example",
          },
          {
            he: "עדכן: תיאור מוצר + מטרה עיקרית + מחיר ממוצע.",
            en: "Update: product description + main goal + average price.",
            structureLevel: "skeleton",
          },
          {
            he: "רוצה לדעת איזה שדה משפיע הכי הרבה על הציון?",
            en: "Want to know which field impacts your score most?",
            structureLevel: "prompt_only",
          },
        ],
      });
    }
  }

  if (connectedSources === 0 && planCount > 0) {
    out.push({
      id: "data-velocity",
      module: "marketing",
      severity: "info",
      title: { he: "אין נתונים מחוברים", en: "No data connected" },
      description: {
        he: "בלי נתונים, ההמלצות מבוססות על שאלון בלבד. חיבור CSV או Meta מייצר פערים ותובנות ספציפיות לעסק שלך.",
        en: "Without data, recommendations are questionnaire-only. Connecting CSV or Meta surfaces gaps and insights specific to your business.",
      },
      tactics: [
        {
          he: "ייבא דוח CSV מהפלטפורמה שלך (פייסבוק, גוגל) דרך הכרטיסייה 'ניתוח' — 2 דק', תוצאות מיד.",
          en: "Import a CSV report from your platform (Facebook, Google) via the Analytics tab — 2 min, instant results.",
          structureLevel: "full_example",
        },
        {
          he: "ייבא CSV: פייסבוק / גוגל / CRM — הכרטיסייה 'ניתוח'.",
          en: "Import CSV: Facebook / Google / CRM — Analytics tab.",
          structureLevel: "skeleton",
        },
        {
          he: "רוצה לחבר נתונים?",
          en: "Want to connect data?",
          structureLevel: "prompt_only",
        },
      ],
    });
  }

  if (funnelResult && hasDifferentiation && funnelResult.formData.averagePrice <= 0) {
    out.push({
      id: "price-missing",
      module: "pricing",
      severity: "warning",
      title: { he: "מחיר ממוצע לא הוגדר", en: "Average price not set" },
      description: {
        he: "מחיר ריאלי הוא הבסיס לחישוב LTV, CAC, ומבנה המדרגות. בלעדיו, המלצות התמחור הן הערכה בלבד.",
        en: "A realistic price is the foundation for LTV, CAC, and tier structure. Without it, pricing recommendations are estimates only.",
      },
      tactics: [
        {
          he: "הכנס מחיר ממוצע בשאלון (ניתן לשנות מאוחר יותר) — הוא ישפיע על חישוב LTV ועל מבנה הטיירים.",
          en: "Enter your average price in the questionnaire (can change later) — it affects LTV calculations and tier structure.",
          structureLevel: "full_example",
        },
        {
          he: "עדכן מחיר ממוצע בשאלון.",
          en: "Update average price in questionnaire.",
          structureLevel: "skeleton",
        },
        {
          he: "מה המחיר הממוצע לעסקה?",
          en: "What's your average transaction price?",
          structureLevel: "prompt_only",
        },
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
        he: "ללא מטרה ברורה, תכניות שימור וצמיחה הן כלליות. מטרה מוגדרת ממקדת את המשפך ואת המדדים.",
        en: "Without a clear goal, retention and growth plans stay generic. A defined goal focuses the funnel and the metrics.",
      },
      tactics: [
        {
          he: "בחר מטרה עיקרית בשאלון (מודעות / לידים / מכירות) — בחירה זו משנה את המשפך כולו.",
          en: "Pick a main goal in the wizard (awareness / leads / sales) — this selection reshapes the entire funnel.",
          structureLevel: "full_example",
        },
        {
          he: "בחר מטרה: מודעות / לידים / מכירות / שימור.",
          en: "Pick a goal: awareness / leads / sales / retention.",
          structureLevel: "skeleton",
        },
        {
          he: "מה המטרה העיקרית שלך ברבעון הקרוב?",
          en: "What's your main goal for the next quarter?",
          structureLevel: "prompt_only",
        },
      ],
    });
  }

  const severityOrder: Record<BottleneckSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return out.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
