// ═══════════════════════════════════════════════
// PricingWizardResults — Display the behavioural-science pricing recommendation
// Shows: optimal price, 3-tier architecture, psychological frames, LTV/CAC
// ═══════════════════════════════════════════════

import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { PricingWizardRecommendation } from "@/engine/pricingWizardEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Copy, DollarSign, Layers, Brain, BarChart3, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

interface Props {
  rec: PricingWizardRecommendation;
}

function formatNIS(n: number) {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function ScoreBar({ value, max = 10, label }: { value: number; max?: number; label: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 65 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toFixed(1)} / {max}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const PricingWizardResults = ({ rec }: Props) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(key);
    toast.success(isHe ? "הועתק!" : "Copied!");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-4">

      {/* ── Hero: Optimal Price ───────────────────────────────────────────── */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-6 pb-5">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Main price */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1" dir="auto">
                {isHe ? "מחיר אופטימלי (Charm)" : "Optimal Price (Charm)"}
              </p>
              <div className="text-5xl font-bold text-primary">{formatNIS(rec.charmPrice)}</div>
              <div className="text-sm text-muted-foreground mt-1" dir="auto">
                {rec.dailyBreakdown[language]}
              </div>
            </div>

            {/* Range + anchor */}
            <div className="flex-1 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground" dir="auto">
                  {isHe ? "טווח מקובל (PSM):" : "Acceptable range (PSM):"}
                </span>
                <span className="font-medium">
                  {formatNIS(rec.acceptableRange.low)} — {formatNIS(rec.acceptableRange.high)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground" dir="auto">
                  {isHe ? "עיגון מחיר (Anchor):" : "Price Anchor:"}
                </span>
                <span className="font-medium line-through opacity-60">{formatNIS(rec.anchorPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground" dir="auto">
                  {isHe ? "פרמיית בידול:" : "Differentiation premium:"}
                </span>
                <Badge variant={rec.differentiationPremium > 0 ? "default" : "secondary"}>
                  {rec.differentiationPremium > 0
                    ? `+${Math.round(rec.differentiationPremium * 100)}%`
                    : isHe ? "ללא" : "None"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Behavioural Science Scores ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            {isHe ? "ציוני מדע ההתנהגות" : "Behavioural Science Scores"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ScoreBar
            value={rec.hormoziScore}
            label={isHe ? "Hormozi Value Score (D×P / T×E)" : "Hormozi Value Score (D×P / T×E)"}
          />
          <ScoreBar
            value={rec.psmOPP}
            max={Math.max(rec.acceptableRange.high * 1.2, 1)}
            label={isHe ? "Van Westendorp OPP (₪)" : "Van Westendorp OPP (₪)"}
          />
          <p className="text-xs text-muted-foreground" dir="auto">
            {rec.rationale[language]}
          </p>
        </CardContent>
      </Card>

      {/* ── 3-Tier Architecture ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            {isHe ? "ארכיטקטורת 3 Tiers (Decoy Effect)" : "3-Tier Architecture (Decoy Effect)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {rec.tiers.map((tier) => (
              <div
                key={tier.role}
                className={`rounded-xl border-2 p-4 text-center relative ${
                  tier.isPrimary
                    ? "border-primary bg-primary/5"
                    : tier.role === "decoy"
                      ? "border-muted opacity-70"
                      : "border-border"
                }`}
              >
                {tier.isPrimary && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap">
                    {isHe ? "מומלץ" : "Recommended"}
                  </Badge>
                )}
                {tier.role === "decoy" && (
                  <Badge variant="outline" className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap">
                    {isHe ? "עוגן נמוך" : "Low anchor"}
                  </Badge>
                )}
                <div className="text-sm font-medium mt-2 mb-1" dir="auto">
                  {tier.name[language]}
                </div>
                <div className="text-2xl font-bold">{formatNIS(tier.price)}</div>
                <div className="text-[10px] text-muted-foreground mt-1" dir="auto">
                  {isHe ? "שנתי:" : "Annual:"} {formatNIS(tier.annualPrice)}/mo
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center" dir="auto">
            {isHe
              ? "Tier 1 (עוגן נמוך) עושה את Tier 2 לבחירה ה'הגיונית' — Ariely Decoy Effect"
              : "Tier 1 (low anchor) makes Tier 2 the 'obvious' choice — Ariely Decoy Effect"}
          </p>
        </CardContent>
      </Card>

      {/* ── Psychological Framing ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-accent" />
            {isHe ? "מסגור פסיכולוגי (Kahneman Prospect Theory)" : "Psychological Framing (Kahneman Prospect Theory)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              key: "primary",
              label: { he: "פריים ראשי — Daily Breakdown", en: "Primary frame — Daily Breakdown" },
              text: rec.primaryFrame[language],
            },
            {
              key: "coi",
              label: { he: "Cost of Inaction — מה הלקוח מפסיד?", en: "Cost of Inaction — what does the customer lose?" },
              text: rec.costOfInactionFrame[language],
            },
          ].map((frame) => (
            <div key={frame.key} className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground" dir="auto">
                  {isHe ? frame.label.he : frame.label.en}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => copy(frame.text, frame.key)}
                >
                  {copiedIdx === frame.key
                    ? <Check className="h-3 w-3" />
                    : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <p className="text-sm" dir="auto">{frame.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Revenue Architecture ─────────────────────────────────────────── */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {isHe ? "ארכיטקטורת הכנסות" : "Revenue Architecture"}
                </span>
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xl font-bold">{formatNIS(rec.ltv)}</div>
                  <div className="text-xs text-muted-foreground">LTV</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{formatNIS(rec.recommendedCAC)}</div>
                  <div className="text-xs text-muted-foreground">
                    {isHe ? "CAC מקסימלי" : "Max CAC"}
                  </div>
                </div>
                <div>
                  {rec.customersNeeded > 0 ? (
                    <>
                      <div className="text-xl font-bold text-primary">{rec.customersNeeded}</div>
                      <div className="text-xs text-muted-foreground" dir="auto">
                        {isHe ? "לקוחות/חודש" : "customers/month"}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xl font-bold text-muted-foreground">—</div>
                      <div className="text-xs text-muted-foreground" dir="auto">
                        {isHe ? "הגדר יעד" : "Set goal"}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground" dir="auto">
                {isHe
                  ? "LTV:CAC אופטימלי הוא 3:1 (מקור: ProfitWell benchmarks)"
                  : "Optimal LTV:CAC is 3:1 (source: ProfitWell benchmarks)"}
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

    </div>
  );
};

export default PricingWizardResults;
