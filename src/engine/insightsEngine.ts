// ═══════════════════════════════════════════════
// Insights Engine — learns from saved plans & localStorage
//
// Detects what worked (high health score, completed modules,
// high-value copy themes) and surfaces actionable patterns.
// Uses the training_pairs + saved_plans data already in the app.
// ═══════════════════════════════════════════════

import type { SavedPlan } from "@/types/funnel";
import { calculateHealthScore } from "./healthScoreEngine";
import { safeStorage } from "@/lib/safeStorage";
import { analyzeTrends } from "./dataImportEngine";
import type { ImportedDataset } from "@/types/importedData";

export interface BusinessInsight {
  id: string;
  type: "win" | "pattern" | "risk" | "tip";
  title: { he: string; en: string };
  body: { he: string; en: string };
  metric?: string;
  confidence: number; // 0-1
}

function getPlans(): SavedPlan[] {
  return safeStorage.getJSON<SavedPlan[]>("funnelforge-plans", []);
}

function getImportedDatasets(): ImportedDataset[] {
  return safeStorage.getJSON<ImportedDataset[]>("funnelforge-imported-data", []);
}

function getVisitedModules(): string[] {
  const flags = [
    safeStorage.getString("funnelforge-differentiation-result", "") ? "differentiation" : null,
  ];
  return flags.filter(Boolean) as string[];
}

export function generateInsights(): BusinessInsight[] {
  const plans = getPlans();
  const insights: BusinessInsight[] = [];

  if (plans.length === 0) return [];

  // Sort by date
  const sorted = [...plans].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
  const latest = sorted[0];
  const latestScore = calculateHealthScore(latest.result).total;

  // ─── Win: high health score ────────────────────────────────
  if (latestScore >= 70) {
    insights.push({
      id: "win-health",
      type: "win",
      title: { he: "ציון בריאות גבוה", en: "Strong health score" },
      body: {
        he: `התוכנית "${latest.name}" השיגה ציון ${latestScore}/100. זה בשליש העליון.`,
        en: `Plan "${latest.name}" scored ${latestScore}/100 — top tier.`,
      },
      metric: `${latestScore}/100`,
      confidence: 0.95,
    });
  }

  // ─── Pattern: multiple plans = learning ────────────────────
  if (plans.length >= 2) {
    const scores = sorted.map((p) => calculateHealthScore(p.result).total);
    const avg = Math.round(scores.reduce((s, n) => s + n, 0) / scores.length);
    const trend = scores[0] > scores[1] ? "עולה" : "יורד";
    const trendEn = scores[0] > scores[1] ? "improving" : "declining";
    insights.push({
      id: "pattern-plans",
      type: "pattern",
      title: { he: `${plans.length} תוכניות — מגמה ${trend}`, en: `${plans.length} plans — ${trendEn} trend` },
      body: {
        he: `ממוצע ציון בריאות על פני כל התוכניות: ${avg}/100.`,
        en: `Average health score across all plans: ${avg}/100.`,
      },
      metric: `ממוצע ${avg}`,
      confidence: 0.8,
    });
  }

  // ─── Pattern: differentiation done ────────────────────────
  const hasDiff = !!safeStorage.getString("funnelforge-differentiation-result", "");
  if (hasDiff) {
    insights.push({
      id: "pattern-diff",
      type: "win",
      title: { he: "בידול מוכן", en: "Differentiation complete" },
      body: {
        he: "השלמת את שלב הבידול — התוכניות שלך ייצרו copy מדויק יותר.",
        en: "You completed differentiation — your plans generate sharper copy.",
      },
      confidence: 0.9,
    });
  }

  // ─── Tip: low health score ─────────────────────────────────
  if (latestScore < 50) {
    insights.push({
      id: "tip-health",
      type: "tip",
      title: { he: "שיפור ציון הבריאות", en: "Improve health score" },
      body: {
        he: `ציון ${latestScore}/100. הכנס ערוצים קיימים, תקציב ומחיר ממוצע מדויק כדי לשפר.`,
        en: `Score: ${latestScore}/100. Add existing channels, budget, and accurate pricing to improve.`,
      },
      metric: `${latestScore}/100`,
      confidence: 0.85,
    });
  }

  // ─── Risk: no plan in 30 days ─────────────────────────────
  const daysSinceLast = latest
    ? Math.floor(
        (Date.now() - new Date(latest.savedAt).getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0;
  if (daysSinceLast > 30) {
    insights.push({
      id: "risk-stale",
      type: "risk",
      title: { he: "תוכנית לא עודכנה", en: "Plan hasn't been updated" },
      body: {
        he: `עברו ${daysSinceLast} ימים מהתוכנית האחרונה. השוק משתנה — כדאי לרענן.`,
        en: `${daysSinceLast} days since the last plan. The market shifts — time to refresh.`,
      },
      metric: `${daysSinceLast} ימים`,
      confidence: 0.75,
    });
  }

  // ─── Tip: top performing channel ──────────────────────────
  const channels: Record<string, number> = {};
  for (const plan of plans) {
    const ch = (plan.result.formData?.existingChannels as string[]) ?? [];
    ch.forEach((c) => { channels[c] = (channels[c] || 0) + 1; });
  }
  const topChannel = Object.entries(channels).sort((a, b) => b[1] - a[1])[0];
  if (topChannel) {
    insights.push({
      id: "tip-channel",
      type: "tip",
      title: { he: `הערוץ המוביל שלך`, en: "Your top channel" },
      body: {
        he: `"${topChannel[0]}" מופיע ב-${topChannel[1]} תוכניות — שקול להכפיל עליו.`,
        en: `"${topChannel[0]}" appears in ${topChannel[1]} plans — consider doubling down.`,
      },
      metric: topChannel[0],
      confidence: 0.7,
    });
  }

  // ─── Tip: pricing model ───────────────────────────────────
  const priceAvg =
    plans.reduce((s, p) => s + (p.result.formData?.averagePrice ?? 0), 0) /
    plans.length;
  if (priceAvg > 0) {
    const suggestedHigher = Math.round(priceAvg * 1.15 / 10) * 10;
    insights.push({
      id: "tip-pricing",
      type: "tip",
      title: { he: "בדוק מחיר גבוה יותר", en: "Test a higher price point" },
      body: {
        he: `המחיר הממוצע שלך ₪${Math.round(priceAvg)}. ניסוי במחיר ₪${suggestedHigher} (+15%) עשוי לשפר NRR.`,
        en: `Your avg price is ₪${Math.round(priceAvg)}. Testing ₪${suggestedHigher} (+15%) could improve NRR.`,
      },
      metric: `₪${Math.round(priceAvg)}`,
      confidence: 0.65,
    });
  }

  // ─── Insights from imported CSV/Excel data ───────────────────
  const datasets = getImportedDatasets();
  if (datasets.length > 0) {
    const latest = datasets[0];
    const analysis = analyzeTrends(latest);
    // Only surface high/medium significance trends
    const notable = analysis.trends.filter((t) => t.significance !== "low" && t.direction !== "stable").slice(0, 2);
    for (const trend of notable) {
      const isPositiveMetric = !trend.metric.toLowerCase().match(/cpc|cpl|cpa|cost|עלות|הוצאה/);
      const isGood = isPositiveMetric ? trend.direction === "up" : trend.direction === "down";
      const sign = trend.changePercent > 0 ? "+" : "";
      insights.push({
        id: `data-${trend.metric.replace(/\s+/g, "-")}`,
        type: isGood ? "win" : "risk",
        title: {
          he: `${trend.metric}: ${sign}${trend.changePercent}%`,
          en: `${trend.metric}: ${sign}${trend.changePercent}%`,
        },
        body: {
          he: trend.insight.he,
          en: trend.insight.en,
        },
        metric: `${sign}${trend.changePercent}%`,
        confidence: analysis.summary.confidence,
      });
    }
    // Overall dataset health summary
    if (analysis.summary.direction !== "stable" && analysis.trends.length > 0) {
      insights.push({
        id: "data-summary",
        type: analysis.summary.direction === "improving" ? "win" : "risk",
        title: {
          he: analysis.summary.direction === "improving" ? "הנתונים שלך משתפרים" : "שים לב: מגמה יורדת בנתונים",
          en: analysis.summary.direction === "improving" ? "Your data is improving" : "Heads up: declining trend in your data",
        },
        body: {
          he: `ניתוח ${latest.rows.length} שורות מ-"${latest.name}" מראה מגמה ${analysis.summary.direction === "improving" ? "חיובית" : "שלילית"} כוללת.`,
          en: `Analysis of ${latest.rows.length} rows from "${latest.name}" shows an overall ${analysis.summary.direction} trend.`,
        },
        metric: latest.name,
        confidence: analysis.summary.confidence * 0.9,
      });
    }
  }

  return insights.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}
