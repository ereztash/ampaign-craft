import { KpiGap, GuidanceItem } from "@/types/meta";
import { FunnelResult } from "@/types/funnel";

const GUIDANCE_MAP: Record<
  string,
  (gap: KpiGap, result: FunnelResult) => GuidanceItem
> = {
  cpc: (gap) => ({
    priority: gap.status === "critical" ? "high" : "medium",
    area: { he: "עלות לקליק (CPC)", en: "Cost Per Click" },
    issue: {
      he: `ה-CPC שלך (${gap.actual.toFixed(2)}) גבוה ב-${Math.abs(gap.gapPercent).toFixed(0)}% מהיעד`,
      en: `Your CPC (${gap.actual.toFixed(2)}) is ${Math.abs(gap.gapPercent).toFixed(0)}% above target`,
    },
    actions: [
      {
        he: "בדוק את ציון הרלוונטיות של המודעות — מטרה: 7 ומעלה",
        en: "Check ad relevance score — target: 7+",
      },
      {
        he: "החלף קריאייטיב: נסה 3 וריאציות חדשות של טקסט/תמונה",
        en: "Swap creative: test 3 new text/image variations",
      },
      {
        he: "צמצם את קהל היעד ל-40%-60% מהגודל הנוכחי — קהל קטן יותר = CPC נמוך יותר",
        en: "Narrow audience to 40-60% of current size — tighter = cheaper",
      },
    ],
    metric: "CPC",
  }),
  ctr: (gap) => ({
    priority: gap.status === "critical" ? "high" : "medium",
    area: { he: "שיעור קליקים (CTR)", en: "Click-Through Rate" },
    issue: {
      he: `ה-CTR שלך (${gap.actual.toFixed(2)}%) נמוך ב-${Math.abs(gap.gapPercent).toFixed(0)}% מהיעד`,
      en: `Your CTR (${gap.actual.toFixed(2)}%) is ${Math.abs(gap.gapPercent).toFixed(0)}% below target`,
    },
    actions: [
      {
        he: 'שנה את ה-hook — 3 השניות הראשונות מחליטות הכל. נסה מספר ספציפי ("73% מהמנהלים...")',
        en: "Change the hook — first 3 seconds decide everything. Try a specific number.",
      },
      {
        he: "הוסף מרכיב של urgency או scarcity ב-CTA",
        en: "Add urgency or scarcity element to your CTA",
      },
      {
        he: "עבור לפורמט וידאו — CTR גבוה ב-20-35% מסטטיק",
        en: "Switch to video format — CTR is 20-35% higher than static",
      },
    ],
    metric: "CTR",
  }),
  cpl: (gap) => ({
    priority: gap.status === "critical" ? "high" : "medium",
    area: { he: "עלות לליד (CPL)", en: "Cost Per Lead" },
    issue: {
      he: `ה-CPL שלך (${gap.actual.toFixed(2)}) גבוה ב-${Math.abs(gap.gapPercent).toFixed(0)}% מהיעד`,
      en: `Your CPL (${gap.actual.toFixed(2)}) is ${Math.abs(gap.gapPercent).toFixed(0)}% above target`,
    },
    actions: [
      {
        he: "בדוק את דף הנחיתה — זמן טעינה מעל 3 שניות = 50% נטישה",
        en: "Check landing page — load time >3s = 50% bounce",
      },
      {
        he: "הפחת שדות בטופס ל-3 לכל היותר — כל שדה נוסף = 11% ירידה בהמרה",
        en: "Reduce form fields to max 3 — each extra field = 11% conversion drop",
      },
      {
        he: "הוסף social proof מעל ה-fold: מספרים, לוגואים, ציטוטים",
        en: "Add social proof above the fold: numbers, logos, quotes",
      },
    ],
    metric: "CPL",
  }),
  cpm: (gap) => ({
    priority: "medium",
    area: { he: "עלות לאלף חשיפות (CPM)", en: "Cost Per Mille" },
    issue: {
      he: `ה-CPM שלך (${gap.actual.toFixed(2)}) גבוה ב-${Math.abs(gap.gapPercent).toFixed(0)}% מהיעד`,
      en: `Your CPM (${gap.actual.toFixed(2)}) is ${Math.abs(gap.gapPercent).toFixed(0)}% above target`,
    },
    actions: [
      {
        he: "נסה קהלים דומים (Lookalike 1-3%) — לרוב CPM נמוך יותר מInterest-based",
        en: "Try Lookalike 1-3% audiences — usually lower CPM than interest-based",
      },
      {
        he: "הוסף placements נוספים: Reels, Stories — מחלק את עלות האוקשן",
        en: "Add placements: Reels, Stories — distributes auction cost",
      },
      {
        he: "הרץ בשעות 6-9 בוקר ו-20-23 בלילה — תחרות נמוכה יותר",
        en: "Run during 6-9am and 8-11pm — lower auction competition",
      },
    ],
    metric: "CPM",
  }),
};

export const generateGuidance = (
  gaps: KpiGap[],
  result: FunnelResult
): GuidanceItem[] => {
  const critical = gaps.filter((g) => g.status === "critical");
  const warning = gaps.filter((g) => g.status === "warning");
  const toProcess = [...critical, ...warning].slice(0, 3); // max 3 items

  return toProcess
    .map((gap) => {
      const key = gap.kpiName.en.toLowerCase();
      for (const [mapKey, fn] of Object.entries(GUIDANCE_MAP)) {
        if (key.includes(mapKey)) return fn(gap, result);
      }
      return null;
    })
    .filter(Boolean) as GuidanceItem[];
};

export const getOverallHealth = (
  gaps: KpiGap[]
): { score: number; label: { he: string; en: string }; color: string } => {
  if (gaps.length === 0) return { score: 0, label: { he: "אין נתונים", en: "No data" }, color: "gray" };

  const criticalCount = gaps.filter((g) => g.status === "critical").length;
  const warningCount = gaps.filter((g) => g.status === "warning").length;
  const goodCount = gaps.filter((g) => g.status === "good").length;
  const total = gaps.length;

  const score = Math.round((goodCount / total) * 100);

  if (score >= 75) return { score, label: { he: "בריא", en: "Healthy" }, color: "green" };
  if (score >= 50) return { score, label: { he: "דורש תשומת לב", en: "Needs Attention" }, color: "yellow" };
  return { score, label: { he: "קריטי", en: "Critical" }, color: "red" };
};
