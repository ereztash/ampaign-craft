import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { tx } from "@/i18n/tx";
import { ChevronDown, Copy, Check, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { ChurnRiskAssessment } from "@/engine/churnPredictionEngine";

interface ChurnPredictionCardProps {
  assessment: ChurnRiskAssessment;
}

const TIER_CONFIG = {
  healthy: { color: "bg-green-500", border: "border-green-500/20", bg: "bg-green-500/5", label: { he: "בריא", en: "Healthy" } },
  watch: { color: "bg-yellow-500", border: "border-yellow-500/20", bg: "bg-yellow-500/5", label: { he: "מעקב", en: "Watch" } },
  "at-risk": { color: "bg-amber-500", border: "border-amber-500/20", bg: "bg-amber-500/5", label: { he: "בסיכון", en: "At Risk" } },
  critical: { color: "bg-red-500", border: "border-destructive/20", bg: "bg-destructive/5", label: { he: "קריטי", en: "Critical" } },
} as const;

const SEVERITY_VARIANT: Record<string, "destructive" | "outline" | "default"> = {
  high: "destructive",
  medium: "outline",
  low: "outline",
};

function getRiskColor(score: number): string {
  if (score >= 70) return "hsl(0, 84%, 60%)";
  if (score >= 50) return "hsl(25, 95%, 53%)";
  if (score >= 30) return "hsl(45, 93%, 47%)";
  return "hsl(142, 76%, 36%)";
}

export function ChurnPredictionCard({ assessment }: ChurnPredictionCardProps) {
  const { language } = useLanguage();
  const isHe = language === "he";
  const tier = TIER_CONFIG[assessment.riskTier];
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [interventionsOpen, setInterventionsOpen] = useState(false);

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success(tx({ he: "הועתק!", en: "Copied!" }, language));
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Group interventions by stage
  const stages = [1, 2, 3];
  const stageNames: Record<number, { he: string; en: string }> = {
    1: { he: "פעיל — מניעה", en: "Active — Prevention" },
    2: { he: "מתנתק — שיקום", en: "Disengaging — Re-engagement" },
    3: { he: "שקט — Win-Back", en: "Silent — Win-Back" },
  };

  return (
    <Card className={`${tier.border}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {tx({ he: "תחזית נטישה", en: "Churn Prediction" }, language)}
          </CardTitle>
          <Badge className={`${tier.color} text-white`}>
            {tier.label[language]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score + NRR Projection */}
        <div className="flex items-center gap-6">
          {/* Circular risk score */}
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
            <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-muted/30"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={getRiskColor(assessment.riskScore)}
                strokeWidth="3"
                strokeDasharray={`${assessment.riskScore}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xl font-bold text-foreground">{assessment.riskScore}</span>
          </div>

          {/* NRR Projection */}
          <div className="flex-1">
            <h4 className="text-sm font-medium mb-2">
              {tx({ he: "תחזית NRR", en: "NRR Projection" }, language)}
            </h4>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-muted-foreground">{assessment.nrrProjection.current}%</div>
                <div className="text-xs text-muted-foreground">{tx({ he: "נוכחי", en: "Current" }, language)}</div>
              </div>
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 text-accent" />
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-accent">{assessment.nrrProjection.withIntervention}%</div>
                <div className="text-xs text-muted-foreground">{tx({ he: "עם התערבות", en: "With Intervention" }, language)}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-500">+{assessment.nrrProjection.improvement}%</div>
                <div className="text-xs text-muted-foreground">{tx({ he: "שיפור", en: "Improvement" }, language)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Signals */}
        {assessment.signals.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium" dir="auto">
              {tx({ he: "אותות סיכון", en: "Risk Signals" }, language)}
            </p>
            {assessment.signals.map((signal, i) => (
              <div key={i} className={`rounded-lg border p-2.5 ${signal.severity === "high" ? "border-destructive/30 bg-destructive/5" : signal.severity === "medium" ? "border-amber-500/20" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{signal.signal}</span>
                  <Badge variant={SEVERITY_VARIANT[signal.severity]} className="text-xs">{signal.severity}</Badge>
                </div>
                <p className="text-xs text-muted-foreground" dir="auto">{signal.description[language]}</p>
              </div>
            ))}
          </div>
        )}

        {/* 3-Stage Interventions */}
        <Collapsible open={interventionsOpen} onOpenChange={setInterventionsOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md p-2 -mx-2 transition-colors">
              <span className="text-sm font-medium" dir="auto">
                {tx({ he: "תוכנית התערבות (3 שלבים)", en: "Intervention Plan (3 Stages)" }, language)}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${interventionsOpen ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 mt-2">
              {stages.map((stage) => {
                const stageInterventions = assessment.interventions.filter((int) => int.stage === stage);
                if (stageInterventions.length === 0) return null;
                return (
                  <div key={stage}>
                    <p className="text-xs font-medium mb-1.5 text-primary" dir="auto">
                      {tx({ he: `שלב ${stage}: `, en: `Stage ${stage}: ` }, language)}{stageNames[stage][language]}
                    </p>
                    <div className="space-y-1.5">
                      {stageInterventions.map((int, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg border p-2.5">
                          <div className="flex flex-col items-center shrink-0 gap-1">
                            <Badge variant="outline" className="text-xs">{int.channel}</Badge>
                            <span className="text-xs text-muted-foreground">{int.timing}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium" dir="auto">{int.action[language]}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line" dir="auto">
                              {int.template[language]}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => copyText(int.template[language], stage * 10 + i)} className="h-6 w-6 p-0 min-h-[44px] min-w-[44px] shrink-0">
                            {copiedIdx === stage * 10 + i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Retention Playbook */}
        {assessment.retentionPlaybook.length > 0 && (
          <div className="rounded-md border p-3 bg-primary/5">
            <p className="text-sm font-medium mb-1.5" dir="auto">
              {tx({ he: "Playbook שימור", en: "Retention Playbook" }, language)}
            </p>
            <ul className="space-y-1">
              {assessment.retentionPlaybook.map((tip, i) => (
                <li key={i} className="text-xs text-muted-foreground" dir="auto">• {tip[language]}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
