import { useMemo, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { FunnelResult } from "@/types/funnel";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { buildChurnPlaybook, type WeeklyAction, type NudgeEvent, type LeadingIndicator, type Phase, type RiskTier } from "@/engine/churnPlaybookEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface ChurnPlaybookTabProps {
  result: FunnelResult;
}

// ═══ Risk Tier Banner ═══

const TIER_CONFIG: Record<RiskTier, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  healthy: {
    bg: "bg-green-50",
    text: "text-green-800",
    border: "border-green-200",
    icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  },
  watch: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    icon: <Clock className="h-4 w-4 text-blue-600" />,
  },
  "at-risk": {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  },
  critical: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
    icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
  },
};

function RiskTierBanner({ tier, score, label, baseline, target, quickWin, language }: {
  tier: RiskTier;
  score: number;
  label: { he: string; en: string };
  baseline: number;
  target: number;
  quickWin: { he: string; en: string };
  language: string;
}) {
  const isHe = language === "he";
  const cfg = TIER_CONFIG[tier];

  return (
    <Card className={`border ${cfg.border} ${cfg.bg}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {cfg.icon}
            <span className={`font-bold text-sm ${cfg.text}`}>
              {isHe ? "רמת סיכון:" : "Risk Level:"} {label[language]}
            </span>
            <Badge className={`text-xs ${cfg.text} border ${cfg.border} bg-transparent`} variant="outline">
              {score}/100
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>NRR {isHe ? "נוכחי" : "current"}: <strong>{baseline}%</strong></span>
            <span className="text-green-600">→ {isHe ? "יעד" : "target"}: <strong>{target}%</strong></span>
          </div>
        </div>
        <div className={`rounded-lg border ${cfg.border} p-3 ${cfg.bg}`}>
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            {isHe ? "פעולה מיידית (Quick Win):" : "Immediate Action (Quick Win):"}
          </p>
          <p className="text-sm font-medium" dir="auto">{quickWin[language]}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══ Weekly Action Timeline ═══

function WeeklyActionTimeline({ actions, language }: { actions: WeeklyAction[]; language: string }) {
  const isHe = language === "he";
  const [copied, setCopied] = useState<number | null>(null);

  const copyTemplate = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    toast.success(isHe ? "תבנית הועתקה!" : "Template copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-3">
      {actions.map((action, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-start gap-3">
            {/* Week badge */}
            <div className="flex flex-col items-center shrink-0">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{action.week}</span>
              </div>
              {i < actions.length - 1 && (
                <div className="w-0.5 h-6 bg-border mt-1" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold">{action.weekLabel[language]}</span>
                <Badge variant="outline" className="text-xs py-0">{action.channel}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2" dir="auto">
                {isHe ? "מיקוד:" : "Focus:"} {action.focus[language]}
              </p>

              {/* Actions list */}
              <ul className="space-y-1 mb-2">
                {action.actions.map((a, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-xs" dir="auto">
                    <span className="text-primary mt-0.5">→</span>
                    <span>{a[language]}</span>
                  </li>
                ))}
              </ul>

              {/* KPI */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <TrendingUp className="h-3 w-3" />
                <span>{isHe ? "KPI:" : "KPI:"} {action.kpi[language]}</span>
              </div>

              {/* Template */}
              <div className="relative rounded-md bg-muted/40 p-2.5 pr-10">
                <p className="text-xs text-muted-foreground" dir="auto">{action.template[language]}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyTemplate(i, action.template[language])}
                  className="absolute top-1.5 right-1.5 h-6 w-6 p-0 min-h-0"
                >
                  {copied === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══ Nudge Schedule ═══

function NudgeSchedule({ nudges, language }: { nudges: NudgeEvent[]; language: string }) {
  const isHe = language === "he";
  return (
    <div className="space-y-2">
      {nudges.map((n, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
          <div className="shrink-0 text-center">
            <div className="text-lg font-bold text-primary">{n.triggerDays}</div>
            <div className="text-xs text-muted-foreground">{isHe ? "ימים" : "days"}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Badge variant="outline" className="text-xs py-0">{n.channel}</Badge>
            </div>
            <p className="text-sm" dir="auto">{n.message[language]}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{isHe ? "מטרה:" : "Goal:"} {n.goal[language]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══ Leading Indicators ═══

function LeadingIndicatorList({ indicators, language }: { indicators: LeadingIndicator[]; language: string }) {
  const isHe = language === "he";
  const FREQ_LABEL: Record<string, string> = {
    daily: isHe ? "יומי" : "Daily",
    weekly: isHe ? "שבועי" : "Weekly",
    monthly: isHe ? "חודשי" : "Monthly",
  };

  return (
    <div className="space-y-2">
      {indicators.map((ind, i) => (
        <div key={i} className="rounded-lg border p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold">{ind.name[language]}</span>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs py-0 text-red-600 border-red-200">
                ⚠ {ind.threshold}
              </Badge>
              <Badge variant="secondary" className="text-xs py-0">
                {FREQ_LABEL[ind.checkFrequency]}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground" dir="auto">{ind.interpretation[language]}</p>
        </div>
      ))}
    </div>
  );
}

// ═══ 60/90 Phase Summary ═══

function Phase6090Summary({ phases, language }: { phases: [Phase, Phase]; language: string }) {
  const isHe = language === "he";
  const PHASE_COLORS = ["border-blue-200 bg-blue-50", "border-green-200 bg-green-50"];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {phases.map((phase, i) => (
        <div key={i} className={`rounded-lg border p-4 ${PHASE_COLORS[i]}`}>
          <div className="text-xs font-semibold text-muted-foreground mb-1">{phase.timeframe}</div>
          <div className="text-sm font-bold mb-1.5">{phase.label[language]}</div>
          <p className="text-xs text-muted-foreground mb-2" dir="auto">{phase.objective[language]}</p>
          <ul className="space-y-1">
            {phase.keyActions.map((a, j) => (
              <li key={j} className="flex items-start gap-1.5 text-xs" dir="auto">
                <span className="text-primary mt-0.5 font-bold">{j + 1}.</span>
                <span>{a[language]}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ═══ MAIN COMPONENT ═══

const ChurnPlaybookTab = ({ result }: ChurnPlaybookTabProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";

  const ukg = useMemo(() => buildUserKnowledgeGraph(result.formData), [result.formData]);
  const playbook = useMemo(() => buildChurnPlaybook(result.formData, ukg), [result.formData, ukg]);

  return (
    <div className="space-y-5">
      {/* Risk banner + quick win */}
      <RiskTierBanner
        tier={playbook.riskTier}
        score={playbook.riskScore}
        label={playbook.riskTierLabel}
        baseline={playbook.nrrBaseline}
        target={playbook.nrrTarget}
        quickWin={playbook.quickWin}
        language={language}
      />

      {/* 4-week action plan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {isHe ? "תוכנית 4 שבועות — Win-Back" : "4-Week Win-Back Plan"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyActionTimeline actions={playbook.weeklyActions} language={language} />
        </CardContent>
      </Card>

      {/* 60/90 day phases */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {isHe ? "תוכנית 60/90 יום" : "60/90 Day Plan"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Phase6090Summary phases={playbook.phase6090} language={language} />
        </CardContent>
      </Card>

      {/* Nudge schedule */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {isHe ? "לוח Nudge אוטומטי" : "Automated Nudge Schedule"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NudgeSchedule nudges={playbook.nudgeSchedule} language={language} />
        </CardContent>
      </Card>

      {/* Leading indicators */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {isHe ? "מדדים מובילים לצפייה" : "Leading Indicators to Watch"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeadingIndicatorList indicators={playbook.leadingIndicators} language={language} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ChurnPlaybookTab;
