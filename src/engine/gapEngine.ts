import { FunnelResult } from "@/types/funnel";
import { MetaInsights, KpiGap } from "@/types/meta";

// Parse target strings like "₪3-8", "2-4%", "30-60"
const parseTargetRange = (
  target: string
): { min: number; max: number; unit: string } | null => {
  const clean = target.replace(/[₪$€,]/g, "").trim();
  const unit = clean.includes("%") ? "%" : "number";
  const stripped = clean.replace("%", "").trim();
  const match = stripped.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { min: parseFloat(match[1]), max: parseFloat(match[2]), unit };
};

const getActualValue = (
  metricKey: string,
  insights: MetaInsights
): number | null => {
  const map: Record<string, () => number | null> = {
    cpc: () => parseFloat(insights.cpc) || null,
    cpm: () => parseFloat(insights.cpm) || null,
    ctr: () => parseFloat(insights.ctr) || null,
    cpl: () => {
      const lead = insights.cost_per_action_type?.find((a) =>
        ["lead", "offsite_conversion.fb_pixel_lead"].includes(a.action_type)
      );
      return lead ? parseFloat(lead.value) : null;
    },
    cvr: () => {
      const clicks = parseFloat(insights.clicks);
      const conv = insights.actions?.find((a) =>
        ["purchase", "lead", "complete_registration"].includes(a.action_type)
      );
      if (!clicks || !conv) return null;
      return (parseFloat(conv.value) / clicks) * 100;
    },
  };

  const normalizedKey = metricKey.toLowerCase();
  for (const [key, fn] of Object.entries(map)) {
    if (normalizedKey.includes(key)) return fn();
  }
  return null;
};

const classifyStatus = (gapPercent: number): KpiGap["status"] => {
  const abs = Math.abs(gapPercent);
  if (gapPercent <= 0) return "good"; // at or below target (cost metrics)
  if (abs <= 20) return "warning";
  return "critical";
};

export const computeGaps = (
  result: FunnelResult,
  insights: MetaInsights
): KpiGap[] => {
  const gaps: KpiGap[] = [];

  for (const kpi of result.kpis) {
    const targetStr = kpi.target;
    const parsed = parseTargetRange(targetStr);
    if (!parsed) continue;

    const actual = getActualValue(kpi.name.en, insights);
    if (actual === null) continue;

    const midTarget = (parsed.min + parsed.max) / 2;
    const gapPercent = ((actual - midTarget) / midTarget) * 100;

    gaps.push({
      kpiName: kpi.name,
      targetMin: parsed.min,
      targetMax: parsed.max,
      unit: parsed.unit,
      actual,
      gapPercent,
      status: classifyStatus(gapPercent),
    });
  }

  return gaps;
};
