import { useMemo, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { FunnelResult } from "@/types/funnel";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { buildExecutiveBrief, type TrafficLight, type BriefRisk, type NRRScenario, type ActionItem } from "@/engine/executiveBriefEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ExecutiveBriefTabProps {
  result: FunnelResult;
}

// ═══ Traffic Light helpers ═══

const LIGHT_ICON = (light: TrafficLight) => {
  if (light === "green") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (light === "amber") return <AlertCircle className="h-4 w-4 text-amber-500" />;
  return <AlertTriangle className="h-4 w-4 text-red-500" />;
};

const LIGHT_BG = {
  green: "border-green-200 bg-green-50",
  amber: "border-amber-200 bg-amber-50",
  red: "border-red-200 bg-red-50",
} as const;

const LIGHT_TEXT = {
  green: "text-green-700",
  amber: "text-amber-700",
  red: "text-red-700",
} as const;

const LIGHT_BADGE = {
  green: "bg-green-100 text-green-800 border-green-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  red: "bg-red-100 text-red-800 border-red-200",
} as const;

// ═══ Health Gauge ═══

function HealthGauge({ score, light, language }: { score: number; light: TrafficLight; language: string }) {
  const isHe = language === "he";
  const dashArray = 283; // 2π × r (r=45)
  const dashOffset = dashArray - (dashArray * score) / 100;
  const strokeColor = light === "green" ? "#22c55e" : light === "amber" ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <span className={`text-sm font-semibold ${LIGHT_TEXT[light]}`}>
        {isHe ? "ציון בריאות" : "Health Score"}
      </span>
    </div>
  );
}

// ═══ Risk Card ═══

function RiskCard({ risk, language }: { risk: BriefRisk; language: string }) {
  const isHe = language === "he";
  return (
    <div className={`rounded-lg border p-3 ${LIGHT_BG[risk.severity]}`}>
      <div className="flex items-start gap-2">
        {LIGHT_ICON(risk.severity)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold">{risk.title[language]}</span>
            <Badge variant="outline" className={`text-xs ${LIGHT_BADGE[risk.severity]}`}>
              {risk.timeHorizon}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-1.5" dir="auto">{risk.description[language]}</p>
          <div className="text-xs font-medium text-primary" dir="auto">
            {isHe ? "פעולה: " : "Action: "}
            {risk.mitigationAction[language]}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ NRR Scenario Bar ═══

function NRRScenarioBar({ scenarios, language }: { scenarios: [NRRScenario, NRRScenario, NRRScenario]; language: string }) {
  const isHe = language === "he";
  const max = Math.max(...scenarios.map((s) => s.nrr), 120);

  return (
    <div className="space-y-3">
      {scenarios.map((s, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{s.label[language]}</span>
            <div className="flex items-center gap-1">
              {s.delta > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : s.delta < 0 ? (
                <TrendingDown className="h-3 w-3 text-red-500" />
              ) : (
                <Minus className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={`font-bold ${LIGHT_TEXT[s.color]}`}>{s.nrr}%</span>
              {s.delta !== 0 && (
                <span className={`text-xs ${s.delta > 0 ? "text-green-500" : "text-red-500"}`}>
                  ({s.delta > 0 ? "+" : ""}{s.delta}%)
                </span>
              )}
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                s.color === "green" ? "bg-green-500" : s.color === "amber" ? "bg-amber-400" : "bg-red-500"
              }`}
              style={{ width: `${(s.nrr / max) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground" dir="auto">{s.description[language]}</p>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        {isHe ? "NRR = Net Revenue Retention. מעל 100% = צמיחה מהלקוחות הקיימים." : "NRR = Net Revenue Retention. Above 100% = growth from existing customers."}
      </p>
    </div>
  );
}

// ═══ Action Checklist ═══

function ActionChecklist({ items, language }: { items: ActionItem[]; language: string }) {
  const isHe = language === "he";
  const [done, setDone] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });

  const PRIORITY_LABEL: Record<number, string> = { 1: isHe ? "דחוף" : "Urgent", 2: isHe ? "חשוב" : "Important", 3: isHe ? "תכנן" : "Plan" };
  const PRIORITY_COLOR: Record<number, string> = { 1: "text-red-600", 2: "text-amber-600", 3: "text-blue-600" };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className={`flex items-start gap-3 rounded-lg border p-3 transition-opacity ${done.has(i) ? "opacity-50" : ""}`}>
          <Checkbox
            checked={done.has(i)}
            onCheckedChange={() => toggle(i)}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-xs font-bold ${PRIORITY_COLOR[item.priority]}`}>
                P{item.priority} — {PRIORITY_LABEL[item.priority]}
              </span>
              <Badge variant="outline" className="text-xs py-0">{item.timeframe}</Badge>
            </div>
            <p className="text-sm" dir="auto">{item.action[language]}</p>
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
              <span>{isHe ? "אחראי:" : "Owner:"} {item.owner[language]}</span>
              <span className="text-green-600">{isHe ? "השפעה:" : "Impact:"} {item.expectedImpact[language]}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══ MAIN COMPONENT ═══

const ExecutiveBriefTab = ({ result }: ExecutiveBriefTabProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";

  const ukg = useMemo(() => buildUserKnowledgeGraph(result.formData), [result.formData]);
  const brief = useMemo(() => buildExecutiveBrief({ result, ukg }), [result, ukg]);

  return (
    <div className="space-y-5">
      {/* Header row: Health Gauge + Executive Summary */}
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <Card className="p-4 flex items-center justify-center">
          <HealthGauge score={brief.healthScore} light={brief.healthLight} language={language} />
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {isHe ? "סיכום מנהלים" : "Executive Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground" dir="auto">
              {brief.executiveSummary[language]}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Badge className={`text-xs border ${LIGHT_BADGE[brief.healthLight]}`} variant="outline">
                {LIGHT_ICON(brief.healthLight)}
                <span className="ms-1">
                  {isHe ? "בריאות" : "Health"}: {brief.healthTier}
                </span>
              </Badge>
              <Badge variant="outline" className="text-xs">
                {new Date(brief.generatedAt).toLocaleDateString(isHe ? "he-IL" : "en-US")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 3 Risks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {isHe ? "3 הסיכונים המרכזיים" : "Top 3 Risks"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {brief.topRisks.map((risk) => (
            <RiskCard key={risk.id} risk={risk} language={language} />
          ))}
        </CardContent>
      </Card>

      {/* NRR Scenarios */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {isHe ? "תרחישי NRR (Net Revenue Retention)" : "NRR Scenarios (Net Revenue Retention)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NRRScenarioBar scenarios={brief.nrrScenarios} language={language} />
        </CardContent>
      </Card>

      {/* Action Checklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {isHe ? "רשימת פעולות לביצוע" : "Action Checklist"}
            <Badge variant="secondary" className="text-xs">
              {brief.actionChecklist.length} {isHe ? "פעולות" : "actions"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActionChecklist items={brief.actionChecklist} language={language} />
        </CardContent>
      </Card>

      {/* Share placeholder */}
      <div className="text-center">
        <Button variant="outline" size="sm" disabled className="text-xs gap-1.5">
          {isHe ? "שתף בריף עם הצוות (בקרוב)" : "Share Brief with Team (coming soon)"}
        </Button>
      </div>
    </div>
  );
};

export default ExecutiveBriefTab;
