import { useLanguage } from "@/i18n/LanguageContext";
import { Bottleneck, Tactic } from "@/engine/bottleneckEngine";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, AlertCircle, Info, Zap, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  bottleneck: Bottleneck;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/30",
    badgeBg: "bg-destructive text-destructive-foreground",
    label: { he: "קריטי", en: "Critical" },
  },
  warning: {
    icon: AlertCircle,
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/30",
    badgeBg: "bg-amber-500 text-white",
    label: { he: "שים לב", en: "Warning" },
  },
  info: {
    icon: Info,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/30",
    badgeBg: "bg-primary text-primary-foreground",
    label: { he: "המלצה", en: "Tip" },
  },
};

const MODULE_LABELS: Record<string, { he: string; en: string }> = {
  differentiation: { he: "בידול", en: "Differentiation" },
  marketing: { he: "שיווק", en: "Marketing" },
  sales: { he: "מכירות", en: "Sales" },
  pricing: { he: "תמחור", en: "Pricing" },
  retention: { he: "שימור", en: "Retention" },
};

const InsightCard = ({ bottleneck }: InsightCardProps) => {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const config = SEVERITY_CONFIG[bottleneck.severity];
  const Icon = config.icon;

  return (
    <Card className={cn("border transition-all hover:shadow-md", config.bg)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config.bg)}>
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="text-sm font-semibold text-foreground" dir="auto">
                {bottleneck.title[language]}
              </h4>
              <Badge className={cn("text-xs h-5", config.badgeBg)}>
                {config.label[language]}
              </Badge>
              <Badge variant="outline" className="text-xs h-5">
                {MODULE_LABELS[bottleneck.module]?.[language]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3" dir="auto">
              {bottleneck.description[language]}
            </p>

            {bottleneck.metric && (
              <div className="flex items-center gap-3 mb-3 text-xs">
                <span className="text-muted-foreground">{bottleneck.metric.label}:</span>
                <span className="font-semibold text-foreground">{bottleneck.metric.value}</span>
                <span className="text-muted-foreground">→ {bottleneck.metric.target}</span>
              </div>
            )}

            {bottleneck.tactics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {bottleneck.tactics.slice(0, 2).map((tactic) => (
                  <Button
                    key={tactic.id}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => tactic.route && navigate(tactic.route)}
                  >
                    <Zap className="h-3 w-3" />
                    {tactic.title[language]}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InsightCard;
