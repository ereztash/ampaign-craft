/**
 * Marketing Health Score Engine
 * Calculates a 0-100 score summarizing marketing readiness.
 * Inspired by HealthTech health scores — creates anchoring + return habit.
 */

import { FormData, FunnelResult } from "@/types/funnel";

export interface HealthScoreBreakdown {
  category: string;
  label: { he: string; en: string };
  score: number; // 0-100
  maxScore: number;
  tips: { he: string; en: string }[];
}

export interface HealthScore {
  total: number; // 0-100
  tier: "critical" | "needs-work" | "good" | "excellent";
  breakdown: HealthScoreBreakdown[];
}

export function calculateHealthScore(result: FunnelResult): HealthScore {
  const { formData } = result;
  const breakdown: HealthScoreBreakdown[] = [];

  // 1. Strategy Clarity (0-25)
  let strategyScore = 0;
  const strategyTips: { he: string; en: string }[] = [];

  if (formData.mainGoal) strategyScore += 8;
  else strategyTips.push({ he: "הגדר מטרה עיקרית", en: "Define a main goal" });

  if (formData.businessField) strategyScore += 5;
  if (formData.audienceType) strategyScore += 5;
  if (formData.salesModel) strategyScore += 4;

  if (formData.productDescription && formData.productDescription.length > 20) strategyScore += 3;
  else strategyTips.push({ he: "הוסף תיאור מוצר מפורט יותר", en: "Add a more detailed product description" });

  breakdown.push({
    category: "strategy",
    label: { he: "בהירות אסטרטגית", en: "Strategy Clarity" },
    score: Math.min(strategyScore, 25),
    maxScore: 25,
    tips: strategyTips,
  });

  // 2. Channel Diversity (0-25)
  let channelScore = 0;
  const channelTips: { he: string; en: string }[] = [];
  const channelCount = formData.existingChannels.length;

  if (channelCount >= 4) channelScore = 25;
  else if (channelCount >= 3) channelScore = 20;
  else if (channelCount >= 2) channelScore = 15;
  else if (channelCount >= 1) channelScore = 10;
  else {
    channelScore = 5;
    channelTips.push({ he: "הוסף לפחות 2 ערוצי שיווק", en: "Add at least 2 marketing channels" });
  }

  if (!formData.existingChannels.includes("email")) {
    channelTips.push({ he: "שקול להוסיף אימייל — ROI הגבוה ביותר", en: "Consider adding email — highest ROI channel" });
  }
  if (!formData.existingChannels.includes("whatsapp") && formData.audienceType !== "b2b") {
    channelTips.push({ he: "שקול להוסיף וואטסאפ — 99% מהישראלים משתמשים", en: "Consider adding WhatsApp — 99% of Israelis use it" });
  }

  breakdown.push({
    category: "channels",
    label: { he: "גיוון ערוצים", en: "Channel Diversity" },
    score: channelScore,
    maxScore: 25,
    tips: channelTips,
  });

  // 3. Budget Fit (0-25)
  let budgetScore = 0;
  const budgetTips: { he: string; en: string }[] = [];

  if (formData.budgetRange === "veryHigh") budgetScore = 25;
  else if (formData.budgetRange === "high") budgetScore = 22;
  else if (formData.budgetRange === "medium") budgetScore = 18;
  else if (formData.budgetRange === "low") {
    budgetScore = 12;
    budgetTips.push({ he: "תקציב נמוך — התמקד בערוצים אורגניים", en: "Low budget — focus on organic channels" });
  }

  if (formData.averagePrice > 0) budgetScore = Math.min(budgetScore + 3, 25);
  else budgetTips.push({ he: "הגדר מחיר ממוצע למוצר", en: "Set an average product price" });

  breakdown.push({
    category: "budget",
    label: { he: "התאמת תקציב", en: "Budget Fit" },
    score: budgetScore,
    maxScore: 25,
    tips: budgetTips,
  });

  // 4. Funnel Quality (0-25)
  let funnelScore = 0;
  const funnelTips: { he: string; en: string }[] = [];

  // Stages with channels
  const stagesWithChannels = result.stages.filter((s) => s.channels.length > 0).length;
  funnelScore += Math.min(stagesWithChannels * 4, 12);

  // KPI count
  if (result.kpis.length >= 5) funnelScore += 5;
  else if (result.kpis.length >= 3) funnelScore += 3;

  // Hook tips
  if (result.hookTips.length >= 5) funnelScore += 4;
  else if (result.hookTips.length >= 3) funnelScore += 2;
  else funnelTips.push({ he: "שדרג לרמה מתקדמת לקבלת יותר הוקים התנהגותיים", en: "Upgrade to advanced for more behavioral hooks" });

  // Neuro-storytelling
  if (result.neuroStorytelling) funnelScore += 4;

  funnelScore = Math.min(funnelScore, 25);

  breakdown.push({
    category: "funnel",
    label: { he: "איכות המשפך", en: "Funnel Quality" },
    score: funnelScore,
    maxScore: 25,
    tips: funnelTips,
  });

  const total = breakdown.reduce((sum, b) => sum + b.score, 0);
  const tier: HealthScore["tier"] =
    total >= 80 ? "excellent" : total >= 60 ? "good" : total >= 40 ? "needs-work" : "critical";

  return { total, tier, breakdown };
}

export function getHealthScoreColor(score: number): string {
  if (score >= 80) return "var(--accent)";
  if (score >= 60) return "var(--primary)";
  if (score >= 40) return "var(--chart-3)";
  return "var(--destructive)";
}
