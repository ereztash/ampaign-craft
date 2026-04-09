import { useLanguage } from "@/i18n/LanguageContext";
import { BottleneckAnalysis } from "@/engine/bottleneckEngine";
import InsightCard from "@/components/InsightCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, Database, Rocket } from "lucide-react";

interface InsightFeedProps {
  analysis: BottleneckAnalysis;
  pulseMessage?: { he: string; en: string };
}

const InsightFeed = ({ analysis, pulseMessage }: InsightFeedProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();

  const hasInsights = analysis.bottlenecks.length > 0 || pulseMessage;

  if (!hasInsights) {
    // Empty state — encourage connecting data
    return (
      <Card className="border-dashed border-2 border-primary/20">
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
            <Database className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground" dir="auto">
            {isHe ? "חבר מידע כדי לקבל תובנות" : "Connect Data to Get Insights"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto" dir="auto">
            {isHe
              ? "ככל שתחבר יותר מקורות מידע, המערכת תהפוך חכמה יותר — אסטרטגיות, טקטיקות וזיהוי חסמים אוטומטי"
              : "The more data sources you connect, the smarter the system becomes — strategies, tactics, and automatic bottleneck detection"}
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => navigate("/data")} className="gap-2">
              <Database className="h-4 w-4" />
              {isHe ? "חבר מקור מידע" : "Connect Data Source"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/wizard")} className="gap-2">
              <Rocket className="h-4 w-4" />
              {isHe ? "צור תוכנית מהירה" : "Quick Plan"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {isHe ? "תובנות ופעולות מומלצות" : "Insights & Recommended Actions"}
        </h3>
      </div>

      {/* Weekly Pulse */}
      {pulseMessage && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <p className="text-sm text-foreground" dir="auto">{pulseMessage[language]}</p>
          </CardContent>
        </Card>
      )}

      {/* Bottleneck insights */}
      {analysis.bottlenecks.map((bottleneck) => (
        <InsightCard key={bottleneck.id} bottleneck={bottleneck} />
      ))}
    </div>
  );
};

export default InsightFeed;
