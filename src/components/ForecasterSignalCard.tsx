// ═══════════════════════════════════════════════
// ForecasterSignalCard — Extreme Forecaster alert
// Wires forecastCollapse() into a loss-aversion card.
// Behavioral: Kahneman Prospect Theory — losses loom
// 2× larger than equivalent gains.
// Shows on Dashboard cold-start zone (Act3 + Rev5).
// ═══════════════════════════════════════════════
import { useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, Zap } from "lucide-react";
import { forecastCollapse, type ForecastInput } from "@/engine/optimization/extremeForecaster";
import { useNavigate } from "react-router-dom";

interface ForecasterSignalCardProps {
  /** Derived from analytics / plan health score — pass real values when available */
  velocity?: number;
  fatigue?: number;
  costEscalation?: number;
  historyVolatility?: number;
  className?: string;
}

export function ForecasterSignalCard({
  velocity = 0.85,
  fatigue = 0.35,
  costEscalation = 1.2,
  historyVolatility = 0.4,
  className = "",
}: ForecasterSignalCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isHe = language === "he";

  const input: ForecastInput = { velocity, fatigue, cost_escalation: costEscalation, history_volatility: historyVolatility };
  const forecast = useMemo(() => forecastCollapse(input), [velocity, fatigue, costEscalation, historyVolatility]);

  // Only render for 'watch' or 'act' signals
  if (forecast.signal === "clear") return null;

  const isAct = forecast.signal === "act";
  const colorClass = isAct
    ? "border-destructive/30 bg-destructive/5"
    : "border-amber-500/30 bg-amber-500/5";
  const IconComponent = isAct ? AlertTriangle : Eye;
  const iconColor = isAct ? "text-destructive" : "text-amber-500";
  const badgeVariant = isAct ? "destructive" : "secondary";

  return (
    <Card className={`${colorClass} ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <IconComponent className={`h-5 w-5 ${iconColor} shrink-0 mt-0.5`} />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground" dir="auto">
                {isAct
                  ? tx({ he: "⚠ אות פעולה: קריסה אפשרית ב-3 ימים", en: "⚠ Act signal: possible collapse in 3 days" }, language)
                  : tx({ he: "👁 אות מעקב: נטר מגמה הזו", en: "👁 Watch signal: monitor this trend" }, language)}
              </p>
              <Badge variant={badgeVariant} className="text-xs">
                {isHe
                  ? `סבירות: ${Math.round(forecast.collapse_probability * 100)}%`
                  : `Probability: ${Math.round(forecast.collapse_probability * 100)}%`}
              </Badge>
            </div>

            {forecast.drivers.length > 0 && (
              <ul className="space-y-1">
                {forecast.drivers.map((d, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className={`${iconColor} mt-0.5`}>•</span>
                    <span dir="auto">{d}</span>
                  </li>
                ))}
              </ul>
            )}

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => navigate("/dashboard")}
            >
              <Zap className="h-3 w-3" />
              {tx({ he: "בדוק את הדשבורד", en: "Review Dashboard" }, language)}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
