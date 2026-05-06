// ═══════════════════════════════════════════════
// PricingWizardResults — Display the behavioural-science pricing recommendation
// Shows: optimal price, 3-tier architecture, psychological frames, LTV/CAC
// ═══════════════════════════════════════════════

import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { PricingWizardRecommendation } from "@/viewmodels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tx } from "@/i18n/tx";
import { Check, Copy, DollarSign, Layers, Brain, BarChart3, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { InsightActionCard } from "@/components/InsightActionCard";
import { getPersistedUserState } from "@/lib/userStateClassifier";

interface Props {
  rec: PricingWizardRecommendation;
  onRetry?: () => void;
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

const PricingWizardResults = ({ rec, onRetry }: Props) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);
  const userState = getPersistedUserState();

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(key);
    toast.success(tx({ he: "הועתק!", en: "Copied!" }, language));
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-4">

      {/* ── InsightActionCard: Recommended price ─────────────────────────── */}
      <InsightActionCard
        module={{ he: "תמחור", en: "Pricing" }}
        answer={{
          he: `המחיר המומלץ: ${formatNIS(rec.charmPrice)}`,
          en: `Recommended price: ${formatNIS(rec.charmPrice)}`,
        }}
        why={rec.rationale}
        confidence="stable"
        confidenceReason={{
          he: `טווח מקובל: ${formatNIS(rec.acceptableRange.low)}–${formatNIS(rec.acceptableRange.high)} · ${rec.dailyBreakdown.he}`,
          en: `Acceptable range: ${formatNIS(rec.acceptableRange.low)}–${formatNIS(rec.acceptableRange.high)} · ${rec.dailyBreakdown.en}`,
        }}
        useItNarrative={{
          he: `השק ב-${formatNIS(rec.charmPrice)} ל-6 שבועות; עקוב אחרי שיעור ההמרה`,
          en: `Launch at ${formatNIS(rec.charmPrice)} for 6 weeks; track your conversion rate`,
        }}
        useItCopy={[
          {
            label: { he: "מחיר להשקה", en: "Launch price" },
            text: { he: formatNIS(rec.charmPrice), en: formatNIS(rec.charmPrice) },
          },
          {
            label: { he: "פירוט יומי", en: "Daily breakdown" },
            text: rec.dailyBreakdown,
          },
        ]}
        checkOptions={[
          { label: { he: "מדויק", en: "Accurate" }, action: "accept" },
          { label: { he: "הקהל שלי שונה", en: "My audience is different" }, action: "reject" },
          { label: { he: "רוצה לראות חלופות", en: "Show alternatives" }, action: "refine" },
        ]}
        userState={userState}
        onCheck={(action) => {
          if (action === "reject") onRetry?.();
        }}
      />

      {/* ── Calculation Details (collapsed) ───────────────────────────────── */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  {tx({ he: "פירוט חישוב", en: "Calculation details" }, language)}
                </span>
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3">
              <ScoreBar
                value={rec.hormoziScore}
                label={tx({ he: "ציון ערך (0-10)", en: "Value score (0-10)" }, language)}
              />
              <ScoreBar
                value={rec.psmOPP}
                max={Math.max(rec.acceptableRange.high * 1.2, 1)}
                label={tx({ he: "נקודת מחיר אופטימלית (₪)", en: "Optimal price point (₪)" }, language)}
              />
              {rec.differentiationPremium > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span dir="auto">{tx({ he: "פרמיית בידול:", en: "Differentiation premium:" }, language)}</span>
                  <Badge variant="default">+{Math.round(rec.differentiationPremium * 100)}%</Badge>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ── 3-Tier Architecture ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            {tx({ he: "3 רמות מחיר", en: "3 Price Tiers" }, language)}
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
                    {tx({ he: "מומלץ", en: "Recommended" }, language)}
                  </Badge>
                )}
                {tier.role === "decoy" && (
                  <Badge variant="outline" className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap">
                    {tx({ he: "עוגן נמוך", en: "Low anchor" }, language)}
                  </Badge>
                )}
                <div className="text-sm font-medium mt-2 mb-1" dir="auto">
                  {tier.name[language]}
                </div>
                <div className="text-2xl font-bold">{formatNIS(tier.price)}</div>
                <div className="text-[10px] text-muted-foreground mt-1" dir="auto">
                  {tx({ he: "שנתי:", en: "Annual:" }, language)} {formatNIS(tier.annualPrice)}/mo
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center" dir="auto">
            {isHe
              ? "הרמה הנמוכה גורמת לאמצעית להרגיש כ'ברירה הברורה'"
              : "The low tier makes the middle one feel like the obvious choice"}
          </p>
        </CardContent>
      </Card>

      {/* ── Psychological Framing ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-accent" />
            {tx({ he: "איך לדבר על המחיר", en: "How to talk about the price" }, language)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              key: "primary",
              label: { he: "פתיחת שיחת מכירות", en: "Sales conversation opener" },
              text: rec.primaryFrame[language],
            },
            {
              key: "coi",
              label: { he: "מה הלקוח מפסיד אם לא קונה?", en: "What does the customer lose by not buying?" },
              text: rec.costOfInactionFrame[language],
            },
          ].map((frame) => (
            <div key={frame.key} className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground" dir="auto">
                  {tx(frame.label, language)}
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
                  {tx({ he: "פירוט הכנסות", en: "Revenue breakdown" }, language)}
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
                  <div className="text-xs text-muted-foreground" dir="auto">
                    {tx({ he: "שווי לקוח", en: "Customer value" }, language)}
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold">{formatNIS(rec.recommendedCAC)}</div>
                  <div className="text-xs text-muted-foreground" dir="auto">
                    {tx({ he: "עלות מרבית לרכישת לקוח", en: "Max acquisition cost" }, language)}
                  </div>
                </div>
                <div>
                  {rec.customersNeeded > 0 ? (
                    <>
                      <div className="text-xl font-bold text-primary">{rec.customersNeeded}</div>
                      <div className="text-xs text-muted-foreground" dir="auto">
                        {tx({ he: "לקוחות/חודש", en: "customers/month" }, language)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xl font-bold text-muted-foreground">—</div>
                      <div className="text-xs text-muted-foreground" dir="auto">
                        {tx({ he: "הגדר יעד", en: "Set goal" }, language)}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground" dir="auto">
                {isHe
                  ? "כלל אצבע: על כל ₪1 שמוציאים על גיוס לקוח, לקוח שווה ₪3"
                  : "Rule of thumb: for every ₪1 spent on acquiring a customer, they should be worth ₪3"}
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

    </div>
  );
};

export default PricingWizardResults;
