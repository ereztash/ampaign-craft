import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import {
  createExperiment,
  getActiveExperiment,
  getAllExperiments,
  logProspectOutcome,
  abandonExperiment,
  analyzeExperiment,
  proposeNextExperiment,
  getCurrentConfidence,
  type CulturalSegment,
  type CustomerOutcome,
  type PricingExperiment,
} from "@/viewmodels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Beaker, Play, Copy, Check, RefreshCcw, X, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface Props {
  recommendedPrice: number;
  segment: CulturalSegment;
}

const OUTCOME_LABELS: Record<CustomerOutcome, { he: string; en: string; emoji: string }> = {
  accepted_full: { he: "שילם מלא", en: "Paid full", emoji: "✅" },
  accepted_with_haggle: { he: "אחרי מו\"מ", en: "After haggle", emoji: "🤝" },
  objected_price: { he: "התנגד למחיר", en: "Price objection", emoji: "💰" },
  objected_value: { he: "לא ראה ערך", en: "Value objection", emoji: "❓" },
  declined: { he: "סירב", en: "Declined", emoji: "❌" },
  ghosted: { he: "התעלם", en: "Ghosted", emoji: "👻" },
};

const PricingExperimentLab = ({ recommendedPrice, segment }: Props) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [activeExperiment, setActiveExperiment] = useState<PricingExperiment | null>(null);
  const [confidence, setConfidence] = useState(getCurrentConfidence());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setActiveExperiment(getActiveExperiment());
    setConfidence(getCurrentConfidence());
  }, []);

  const handleCreate = () => {
    const exp = createExperiment({ testedPrice: recommendedPrice, segment, cohortSize: 5 });
    setActiveExperiment(exp);
    setConfidence(getCurrentConfidence());
    toast.success(tx({ he: "ניסוי חדש נפתח. בהצלחה!", en: "New experiment started. Good luck!" }, language));
  };

  const handleLog = (prospectId: string, outcome: CustomerOutcome) => {
    if (!activeExperiment) return;
    const updated = logProspectOutcome(activeExperiment.id, prospectId, outcome);
    setActiveExperiment(updated);
    setConfidence(getCurrentConfidence());
  };

  const handleAbandon = () => {
    if (!activeExperiment) return;
    abandonExperiment(activeExperiment.id);
    setActiveExperiment(null);
    setConfidence(getCurrentConfidence());
    toast.info(tx({ he: "הניסוי נסגר", en: "Experiment closed" }, language));
  };

  const handleCopyScript = () => {
    if (!activeExperiment) return;
    navigator.clipboard.writeText(activeExperiment.scriptUsed[language]);
    setCopied(true);
    toast.success(tx({ he: "הסקריפט הועתק", en: "Script copied" }, language));
    setTimeout(() => setCopied(false), 2000);
  };

  const result = useMemo(
    () => (activeExperiment ? analyzeExperiment(activeExperiment) : null),
    [activeExperiment],
  );

  const nextExperiment = useMemo(
    () =>
      result && activeExperiment && activeExperiment.status === "complete"
        ? proposeNextExperiment({
            lastResult: result,
            lastTestedPrice: activeExperiment.testedPrice,
            segment,
          })
        : null,
    [result, activeExperiment, segment],
  );

  const loggedCount = activeExperiment?.prospects.filter((p) => p.outcome !== null).length ?? 0;
  const totalCount = activeExperiment?.prospects.length ?? 0;
  const progressPct = totalCount > 0 ? (loggedCount / totalCount) * 100 : 0;

  const allExperiments = getAllExperiments();
  const completedCount = allExperiments.filter((e) => e.status === "complete").length;

  return (
    <Card className="border-accent/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Beaker className="h-4 w-4 text-accent" />
          {tx({ he: "מעבדת מחיר", en: "Pricing Lab" }, language)}
          <Badge variant="outline" className="text-xs">
            {confidence.badge[language]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!activeExperiment && (
          <div className="rounded-lg bg-accent/5 border border-accent/20 p-4 space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-1">
                {tx({ he: "בדוק את המחיר על 5 לקוחות אמיתיים", en: "Test the price on 5 real prospects" }, language)}
              </h4>
              <p className="text-xs text-muted-foreground" dir="auto">
                {tx(
                  {
                    he: `המחיר המומלץ הוא ₪${recommendedPrice.toLocaleString("he-IL")}. ניסוי = שלח את הסקריפט המוכן ל-5 לקוחות פוטנציאליים, חזור לכאן וסמן כל אחד. בסוף תקבל המלצה מכוילת לפי הריאקציות.`,
                    en: `Recommended price is ₪${recommendedPrice.toLocaleString("en-US")}. Experiment = send the prepared script to 5 prospects, return here and log each one. At the end you'll get a calibrated recommendation.`,
                  },
                  language,
                )}
              </p>
            </div>
            <Button onClick={handleCreate} className="w-full">
              <Play className="h-3.5 w-3.5 me-2" />
              {tx({ he: "פתח ניסוי", en: "Start experiment" }, language)}
            </Button>
            {completedCount > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                {tx({ he: `${completedCount} ניסויים קודמים הושלמו`, en: `${completedCount} previous experiments completed` }, language)}
              </p>
            )}
          </div>
        )}

        {activeExperiment && activeExperiment.status === "running" && (
          <>
            <div className="rounded-lg bg-muted/30 border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  {tx({ he: "הסקריפט שלך לוואטסאפ", en: "Your WhatsApp script" }, language)}
                </span>
                <Button size="sm" variant="ghost" onClick={handleCopyScript} className="h-7">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <p className="text-xs whitespace-pre-line bg-background rounded p-2 border" dir="auto">
                {activeExperiment.scriptUsed[language]}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">
                  {tx({ he: "תיעוד תוצאות", en: "Log outcomes" }, language)} ({loggedCount}/{totalCount})
                </span>
                <Progress value={progressPct} className="w-24 h-2" />
              </div>
              <div className="space-y-2">
                {activeExperiment.prospects.map((p, i) => (
                  <div key={p.id} className="rounded-lg border p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium">
                        {tx({ he: `לקוח #${i + 1}`, en: `Prospect #${i + 1}` }, language)}
                      </span>
                      {p.outcome && (
                        <Badge variant="outline" className="text-xs">
                          {OUTCOME_LABELS[p.outcome].emoji} {OUTCOME_LABELS[p.outcome][language]}
                        </Badge>
                      )}
                    </div>
                    {!p.outcome && (
                      <div className="grid grid-cols-3 gap-1">
                        {(Object.keys(OUTCOME_LABELS) as CustomerOutcome[]).map((outcome) => (
                          <Button
                            key={outcome}
                            size="sm"
                            variant="outline"
                            onClick={() => handleLog(p.id, outcome)}
                            className="text-xs h-7 px-2"
                          >
                            <span className="me-1">{OUTCOME_LABELS[outcome].emoji}</span>
                            <span className="truncate">{OUTCOME_LABELS[outcome][language]}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={handleAbandon} className="w-full text-xs">
              <X className="h-3 w-3 me-1" />
              {tx({ he: "סגור ניסוי בלי לנתח", en: "Close without analyzing" }, language)}
            </Button>
          </>
        )}

        {activeExperiment && activeExperiment.status === "complete" && result && (
          <>
            <div className="rounded-lg bg-primary/5 border border-primary/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">
                  {tx({ he: "תוצאת הניסוי", en: "Experiment result" }, language)}
                </span>
                <Badge variant="default" className="text-xs">
                  {Math.round(result.acceptanceRate * 100)}% {tx({ he: "קבלה", en: "acceptance" }, language)}
                </Badge>
              </div>
              <p className="text-xs" dir="auto">{result.insight[language]}</p>
              {result.avgPaidPrice && (
                <p className="text-xs text-muted-foreground">
                  {tx({ he: "מחיר ממוצע ששולם:", en: "Avg paid:" }, language)} ₪{result.avgPaidPrice.toLocaleString(isHe ? "he-IL" : "en-US")}
                </p>
              )}
            </div>

            {nextExperiment && (
              <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    {tx({ he: "ניסוי הבא מומלץ", en: "Next recommended experiment" }, language)}
                  </span>
                  <Badge>₪{nextExperiment.proposedPrice.toLocaleString(isHe ? "he-IL" : "en-US")}</Badge>
                </div>
                <p className="text-xs" dir="auto">{nextExperiment.hypothesis[language]}</p>
                <Button
                  size="sm"
                  onClick={() => {
                    const exp = createExperiment({
                      testedPrice: nextExperiment.proposedPrice,
                      segment,
                      cohortSize: nextExperiment.cohortSize,
                      hypothesis: nextExperiment.hypothesis,
                    });
                    setActiveExperiment(exp);
                    setConfidence(getCurrentConfidence());
                  }}
                  className="w-full"
                >
                  <RefreshCcw className="h-3.5 w-3.5 me-2" />
                  {tx({ he: "התחל את הניסוי הבא", en: "Start next experiment" }, language)}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PricingExperimentLab;
