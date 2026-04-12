import { useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getMonthlyUsage, getMonthlyCap, getUsageHistory, type PricingTier } from "@/services/llmRouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";

interface UsageDashboardProps {
  compact?: boolean;
}

const UsageDashboard = ({ compact = false }: UsageDashboardProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { tier } = useAuth();
  const navigate = useNavigate();

  const monthly = useMemo(() => getMonthlyUsage(), []);
  const cap = useMemo(() => getMonthlyCap(tier as PricingTier), [tier]);
  const history = useMemo(() => getUsageHistory(), []);

  const usedPercent = cap > 0 ? Math.min(100, Math.round((monthly.totalCostNIS / cap) * 100)) : 0;
  const isNearLimit = usedPercent >= 80;
  const todayCalls = history.filter((r) => r.timestamp.startsWith(new Date().toISOString().slice(0, 10))).length;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Zap className="h-3 w-3" />
        <span>
          {isHe ? `AI: ₪${monthly.totalCostNIS.toFixed(1)}/${cap}` : `AI: ₪${monthly.totalCostNIS.toFixed(1)}/${cap}`}
        </span>
        <Progress value={usedPercent} className="h-1.5 w-16" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2" dir="auto">
          <Zap className="h-4 w-4" />
          {isHe ? "שימוש AI החודש" : "AI Usage This Month"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground" dir="auto">
            <span>₪{monthly.totalCostNIS.toFixed(2)}</span>
            <span>₪{cap}</span>
          </div>
          <Progress value={usedPercent} className={isNearLimit ? "[&>div]:bg-amber-500" : ""} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs" dir="auto">
          <div>
            <span className="text-muted-foreground">{isHe ? "קריאות היום" : "Calls today"}</span>
            <p className="font-semibold">{todayCalls}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{isHe ? "טוקנים החודש" : "Tokens this month"}</span>
            <p className="font-semibold">{monthly.totalTokens.toLocaleString()}</p>
          </div>
        </div>

        {isNearLimit && (
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => navigate("/pricing")}>
            {isHe ? "שדרג לקבלת יותר AI" : "Upgrade for more AI"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default UsageDashboard;
