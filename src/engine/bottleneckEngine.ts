// ═══════════════════════════════════════════════
// Bottleneck Detection Engine
// Analyzes all connected data to identify growth bottlenecks
// across the 5-module pipeline with severity and recommended tactics
// ═══════════════════════════════════════════════

import { FunnelResult } from "@/types/funnel";
import { UserKnowledgeGraph } from "./userKnowledgeGraph";
import { HealthScore, calculateHealthScore } from "./healthScoreEngine";

export type BottleneckSeverity = "critical" | "warning" | "info";
export type BottleneckModule = "differentiation" | "marketing" | "sales" | "pricing" | "retention";

export interface Bottleneck {
  id: string;
  module: BottleneckModule;
  severity: BottleneckSeverity;
  title: { he: string; en: string };
  description: { he: string; en: string };
  metric?: { label: string; value: string; target: string };
  tactics: Tactic[];
}

export interface Tactic {
  id: string;
  title: { he: string; en: string };
  description: { he: string; en: string };
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  route?: string;
}

export interface BottleneckAnalysis {
  bottlenecks: Bottleneck[];
  moduleHealth: Record<BottleneckModule, { score: number; status: "healthy" | "warning" | "critical" }>;
  overallScore: number;
  topPriority: Bottleneck | null;
}

export function analyzeBottlenecks(
  result: FunnelResult | null,
  graph: UserKnowledgeGraph | null,
  hasDiff: boolean,
  planCount: number,
): BottleneckAnalysis {
  const bottlenecks: Bottleneck[] = [];

  // Module health defaults
  const moduleHealth: Record<BottleneckModule, { score: number; status: "healthy" | "warning" | "critical" }> = {
    differentiation: { score: 0, status: "critical" },
    marketing: { score: 0, status: "critical" },
    sales: { score: 0, status: "critical" },
    pricing: { score: 0, status: "critical" },
    retention: { score: 0, status: "critical" },
  };

  // === DIFFERENTIATION MODULE ===
  if (!hasDiff) {
    bottlenecks.push({
      id: "diff-missing",
      module: "differentiation",
      severity: "critical",
      title: { he: "בידול לא הוגדר", en: "No Differentiation Defined" },
      description: {
        he: "בלי בידול ברור, כל שאר המודולים פועלים בגנרי — סקריפטי מכירה, תמחור ותוכן לא מותאמים",
        en: "Without clear differentiation, all other modules operate generically — sales scripts, pricing, and content are not personalized",
      },
      tactics: [
        {
          id: "start-diff",
          title: { he: "התחל תהליך בידול", en: "Start Differentiation Process" },
          description: { he: "10 דקות שישנו את כל התוצאות", en: "10 minutes that change all results" },
          effort: "medium",
          impact: "high",
          route: "/differentiate",
        },
      ],
    });
    moduleHealth.differentiation = { score: 10, status: "critical" };
  } else {
    // Check differentiation quality
    try {
      const diffRaw = localStorage.getItem("funnelforge-differentiation-result");
      if (diffRaw) {
        const diff = JSON.parse(diffRaw);
        const diffScore = diff.differentiationScore || 0;
        const claimScore = diff.claimVerificationScore || 0;

        if (diffScore < 50) {
          bottlenecks.push({
            id: "diff-weak",
            module: "differentiation",
            severity: "warning",
            title: { he: "בידול חלש", en: "Weak Differentiation" },
            description: {
              he: `ציון הבידול שלך ${diffScore}/100 — יש מקום לשיפור`,
              en: `Your differentiation score is ${diffScore}/100 — room for improvement`,
            },
            metric: { label: "Score", value: `${diffScore}`, target: "70+" },
            tactics: [
              {
                id: "improve-diff",
                title: { he: "חזור לתהליך בידול", en: "Revisit Differentiation" },
                description: { he: "עדכן טענות ובנה ראיות חזקות יותר", en: "Update claims and build stronger evidence" },
                effort: "medium",
                impact: "high",
                route: "/differentiate",
              },
            ],
          });
          moduleHealth.differentiation = { score: diffScore, status: diffScore < 30 ? "critical" : "warning" };
        } else {
          moduleHealth.differentiation = { score: diffScore, status: "healthy" };
        }

        if (claimScore < 50) {
          bottlenecks.push({
            id: "diff-claims-weak",
            module: "differentiation",
            severity: "warning",
            title: { he: "טענות בלי ראיות", en: "Claims Without Evidence" },
            description: {
              he: "חלק מהטענות שלך לא נתמכות בראיות — זה פוגע באמינות",
              en: "Some of your claims lack supporting evidence — this hurts credibility",
            },
            metric: { label: "Verification", value: `${claimScore}%`, target: "70%+" },
            tactics: [
              {
                id: "add-evidence",
                title: { he: "הוסף ראיות", en: "Add Evidence" },
                description: { he: "ציטוטי לקוחות, נתונים, case studies", en: "Customer quotes, data, case studies" },
                effort: "low",
                impact: "high",
                route: "/differentiate",
              },
            ],
          });
        }
      }
    } catch {
      moduleHealth.differentiation = { score: 50, status: "warning" };
    }
  }

  // === MARKETING MODULE ===
  if (planCount === 0) {
    bottlenecks.push({
      id: "mktg-no-plan",
      module: "marketing",
      severity: "critical",
      title: { he: "אין תוכנית שיווק", en: "No Marketing Plan" },
      description: {
        he: "בלי תוכנית, אתה פועל בלי כיוון — תקציב מתבזבז",
        en: "Without a plan, you're operating without direction — budget is wasted",
      },
      tactics: [
        {
          id: "create-plan",
          title: { he: "צור תוכנית שיווק", en: "Create Marketing Plan" },
          description: { he: "2 דקות לתוכנית מלאה", en: "2 minutes to a full plan" },
          effort: "low",
          impact: "high",
          route: "/wizard",
        },
      ],
    });
    moduleHealth.marketing = { score: 5, status: "critical" };
  } else if (result) {
    const health = calculateHealthScore(result);
    moduleHealth.marketing = {
      score: health.total,
      status: health.total >= 70 ? "healthy" : health.total >= 40 ? "warning" : "critical",
    };

    if (health.total < 40) {
      bottlenecks.push({
        id: "mktg-health-low",
        module: "marketing",
        severity: "critical",
        title: { he: "ציון בריאות שיווקית נמוך", en: "Low Marketing Health Score" },
        description: {
          he: `ציון ${health.total}/100 — יש פערים משמעותיים באסטרטגיה`,
          en: `Score ${health.total}/100 — significant gaps in strategy`,
        },
        metric: { label: "Health", value: `${health.total}`, target: "70+" },
        tactics: health.breakdown
          .filter((b) => b.tips.length > 0)
          .slice(0, 2)
          .map((b, i) => ({
            id: `health-fix-${i}`,
            title: b.tips[0],
            description: { he: `שיפור ב${b.label.he}`, en: `Improve ${b.label.en}` },
            effort: "low" as const,
            impact: "medium" as const,
          })),
      });
    }

    // Check channel diversity
    const channels = result.formData.existingChannels || [];
    if (channels.length < 3) {
      bottlenecks.push({
        id: "mktg-channels",
        module: "marketing",
        severity: "warning",
        title: { he: "גיוון ערוצים נמוך", en: "Low Channel Diversity" },
        description: {
          he: `יש לך ${channels.length} ערוצים — פחות מ-3 מגביל את הגעה`,
          en: `You have ${channels.length} channels — less than 3 limits reach`,
        },
        tactics: [
          {
            id: "add-channels",
            title: { he: "הוסף ערוצים", en: "Add Channels" },
            description: { he: "עדכן את התוכנית עם ערוצים נוספים", en: "Update plan with additional channels" },
            effort: "low",
            impact: "medium",
            route: "/wizard",
          },
        ],
      });
    }
  }

  // === SALES MODULE ===
  if (result) {
    const hasSalesData = !!result.salesPipeline;
    if (!hasSalesData) {
      moduleHealth.sales = { score: 30, status: "warning" };
      bottlenecks.push({
        id: "sales-no-pipeline",
        module: "sales",
        severity: "warning",
        title: { he: "אין Pipeline מכירות", en: "No Sales Pipeline" },
        description: {
          he: "בלי pipeline, קשה לנהל ולחזות מכירות",
          en: "Without a pipeline, it's hard to manage and forecast sales",
        },
        tactics: [
          {
            id: "view-sales",
            title: { he: "צפה בסקריפטי מכירה", en: "View Sales Scripts" },
            description: { he: "סקריפטים מותאמים לDISC profile שלך", en: "Scripts personalized to your DISC profile" },
            effort: "low",
            impact: "high",
            route: "/sales",
          },
        ],
      });
    } else {
      moduleHealth.sales = { score: 65, status: "healthy" };
    }
  } else {
    moduleHealth.sales = { score: 0, status: "critical" };
  }

  // === PRICING MODULE ===
  if (result) {
    const price = result.formData.averagePrice || 0;
    if (price === 0) {
      bottlenecks.push({
        id: "pricing-no-price",
        module: "pricing",
        severity: "warning",
        title: { he: "מחיר לא הוגדר", en: "No Price Defined" },
        description: {
          he: "בלי מחיר ברור, אי אפשר לבנות מבנה tiers ו-offer stack",
          en: "Without a clear price, can't build tier structure and offer stack",
        },
        tactics: [
          {
            id: "set-pricing",
            title: { he: "הגדר תמחור", en: "Set Pricing" },
            description: { he: "בנה מבנה 3 tiers עם decoy pricing", en: "Build 3-tier structure with decoy pricing" },
            effort: "medium",
            impact: "high",
            route: "/pricing",
          },
        ],
      });
      moduleHealth.pricing = { score: 20, status: "warning" };
    } else {
      moduleHealth.pricing = { score: 60, status: "healthy" };
    }
  } else {
    moduleHealth.pricing = { score: 0, status: "critical" };
  }

  // === RETENTION MODULE ===
  if (result?.formData.salesModel === "subscription") {
    bottlenecks.push({
      id: "retention-sub-critical",
      module: "retention",
      severity: "info",
      title: { he: "מודל מנויים — שימור קריטי", en: "Subscription Model — Retention Critical" },
      description: {
        he: "במודל מנויים, שימור הוא הגורם #1 לרווחיות — הגדר onboarding",
        en: "In subscription models, retention is the #1 profitability driver — set up onboarding",
      },
      tactics: [
        {
          id: "setup-retention",
          title: { he: "הגדר תוכנית שימור", en: "Set Up Retention Plan" },
          description: { he: "Onboarding, churn prevention, referral", en: "Onboarding, churn prevention, referral" },
          effort: "medium",
          impact: "high",
          route: "/retention",
        },
      ],
    });
    moduleHealth.retention = { score: 30, status: "warning" };
  } else if (result) {
    moduleHealth.retention = { score: 40, status: "warning" };
  }

  // Sort by severity
  const severityOrder: Record<BottleneckSeverity, number> = { critical: 0, warning: 1, info: 2 };
  bottlenecks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Calculate overall score
  const scores = Object.values(moduleHealth).map((m) => m.score);
  const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return {
    bottlenecks,
    moduleHealth,
    overallScore,
    topPriority: bottlenecks[0] || null,
  };
}
