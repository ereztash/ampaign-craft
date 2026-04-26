import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSavedPlans } from "@/hooks/useSavedPlans";
import { useCampaignTracking, MetricComparison } from "@/hooks/useCampaignTracking";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import PaywallModal from "@/components/PaywallModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/i18n/tx";
import { TrendingUp, TrendingDown, Minus, Plus, BarChart3, Lock } from "lucide-react";

const METRICS = ["CPC", "CPL", "CPA", "CTR", "CVR", "Impressions", "Clicks", "Conversions"];

const CampaignCockpit = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { plans } = useSavedPlans();
  const { canUse, checkAccess, paywallOpen, setPaywallOpen, paywallFeature, paywallTier, dataUnlockHint } = useFeatureGate();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const { metrics, addMetric, getComparison } = useCampaignTracking(selectedPlanId);

  // Input state
  const [inputMetric, setInputMetric] = useState("CPC");
  const [inputValue, setInputValue] = useState("");
  const [inputChannel, setInputChannel] = useState("facebook");

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const comparisons = getComparison();

  const handleAdd = () => {
    if (!inputValue || !selectedPlanId) return;
    const projected = selectedPlan?.result.kpis.find((k) =>
      k.name.en.toLowerCase().includes(inputMetric.toLowerCase())
    )?.target || "N/A";

    addMetric(
      "general", inputChannel, inputMetric,
      projected, parseFloat(inputValue),
      new Date().toISOString().split("T")[0]
    );
    setInputValue("");
  };

  const statusIcon = (status: MetricComparison["status"]) => {
    if (status === "outperforming") return <TrendingUp className="h-4 w-4 text-accent" />;
    if (status === "underperforming") return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {tx({ he: "לוח בקרה: Campaign Cockpit", en: "Campaign Cockpit" }, language)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {tx({ he: "עקוב אחרי ביצועים בפועל מול תחזיות FunnelForge", en: "Track actual performance vs FunnelForge projections" }, language)}
          </p>
        </div>
      </div>

      {!canUse("campaignCockpit") && (
        <Card className="border-dashed border-primary/20">
          <CardContent className="text-center py-8">
            <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              {tx({ he: "Campaign Cockpit זמין בתוכנית Business", en: "Campaign Cockpit is available in the Business plan" }, language)}
            </p>
            <Button onClick={() => checkAccess("campaignCockpit", "business")} variant="outline">
              {tx({ he: "שדרג עכשיו", en: "Upgrade Now" }, language)}
            </Button>
          </CardContent>
        </Card>
      )}

      {canUse("campaignCockpit") && <>
      {/* Plan Selector */}
      <Select value={selectedPlanId || ""} onValueChange={setSelectedPlanId}>
        <SelectTrigger>
          <SelectValue placeholder={tx({ he: "בחר תוכנית לעקוב...", en: "Select a plan to track..." }, language)} />
        </SelectTrigger>
        <SelectContent>
          {plans.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPlanId && (
        <>
          {/* Input Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{tx({ he: "הוסף מדד בפועל", en: "Add Actual Metric" }, language)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                <Select value={inputMetric} onValueChange={setInputMetric}>
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRICS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={tx({ he: "ערך בפועל", en: "Actual value" }, language)}
                  aria-label={tx({ he: "ערך בפועל", en: "Actual value" }, language)}
                  className="w-full sm:w-[140px]"
                />
                <Select value={inputChannel} onValueChange={setInputChannel}>
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["facebook", "instagram", "google", "whatsapp", "email", "content", "tikTok", "linkedIn"].map((ch) => (
                      <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAdd} size="default" className="gap-1 h-10 col-span-2 sm:col-span-1">
                  <Plus className="h-3.5 w-3.5" />
                  {tx({ he: "הוסף", en: "Add" }, language)}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Cards */}
          {comparisons.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {tx({ he: "תחזית מול ביצוע", en: "Projected vs Actual" }, language)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {comparisons.map((c, i) => (
                    <div key={i} className={`rounded-xl border p-3 ${
                      c.status === "outperforming" ? "border-accent/30 bg-accent/5" :
                      c.status === "underperforming" ? "border-destructive/30 bg-destructive/5" :
                      ""
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{c.metric}</span>
                        {statusIcon(c.status)}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-muted-foreground">{tx({ he: "תחזית:", en: "Projected:" }, language)} {c.projected}</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-sm font-bold">{c.actual}</span>
                      </div>
                      <Badge variant={c.status === "outperforming" ? "default" : "outline"} className="mt-1 text-xs">
                        {c.delta}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Entries */}
          {metrics.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{tx({ he: "רשומות אחרונות", en: "Recent Entries" }, language)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.slice(0, 10).map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-xs border-b pb-1.5">
                      <span className="text-muted-foreground">{m.date}</span>
                      <span className="font-medium">{m.metric}: {m.actualValue}</span>
                      <span className="text-muted-foreground">{m.channel}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </>}
    <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} feature={paywallFeature} requiredTier={paywallTier} dataUnlockHint={dataUnlockHint} />
    </div>
  );
};

export default CampaignCockpit;
