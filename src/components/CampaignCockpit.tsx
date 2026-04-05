import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSavedPlans } from "@/hooks/useSavedPlans";
import { useCampaignTracking, MetricComparison } from "@/hooks/useCampaignTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Plus, BarChart3 } from "lucide-react";

const METRICS = ["CPC", "CPL", "CPA", "CTR", "CVR", "Impressions", "Clicks", "Conversions"];

const CampaignCockpit = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { plans } = useSavedPlans();
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
            {isHe ? "לוח בקרה — Campaign Cockpit" : "Campaign Cockpit"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isHe ? "עקוב אחרי ביצועים בפועל מול תחזיות FunnelForge" : "Track actual performance vs FunnelForge projections"}
          </p>
        </div>
      </div>

      {/* Plan Selector */}
      <Select value={selectedPlanId || ""} onValueChange={setSelectedPlanId}>
        <SelectTrigger>
          <SelectValue placeholder={isHe ? "בחר תוכנית לעקוב..." : "Select a plan to track..."} />
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
              <CardTitle className="text-sm">{isHe ? "הוסף מדד בפועל" : "Add Actual Metric"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Select value={inputMetric} onValueChange={setInputMetric}>
                  <SelectTrigger className="w-[130px]">
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
                  placeholder={isHe ? "ערך בפועל" : "Actual value"}
                  className="w-[140px]"
                />
                <Select value={inputChannel} onValueChange={setInputChannel}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["facebook", "instagram", "google", "whatsapp", "email", "content", "tikTok", "linkedIn"].map((ch) => (
                      <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAdd} size="sm" className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  {isHe ? "הוסף" : "Add"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Cards */}
          {comparisons.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {isHe ? "תחזית מול ביצוע" : "Projected vs Actual"}
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
                        <span className="text-xs text-muted-foreground">{isHe ? "תחזית:" : "Projected:"} {c.projected}</span>
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
                <CardTitle className="text-sm">{isHe ? "רשומות אחרונות" : "Recent Entries"}</CardTitle>
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
    </div>
  );
};

export default CampaignCockpit;
