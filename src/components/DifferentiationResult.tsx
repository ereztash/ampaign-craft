import { useLanguage } from "@/i18n/LanguageContext";
import { DifferentiationResult as DiffResult } from "@/types/differentiation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tx } from "@/i18n/tx";
import { Sparkles, ShieldCheck, Map, Users, Scale, BarChart3, FileText, ArrowLeft } from "lucide-react";

interface DifferentiationResultProps {
  result: DiffResult;
  onBack: () => void;
}

const DifferentiationResultView = ({ result, onBack }: DifferentiationResultProps) => {
  const { t, language } = useLanguage();
  const isHe = language === "he";

  const scoreColor = (score: number) =>
    score >= 70 ? "text-accent" : score >= 40 ? "text-amber-500" : "text-destructive";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Score Header */}
      <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-start">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className={`text-4xl font-bold ${scoreColor(result.differentiationStrength)}`}>
              {result.differentiationStrength}
            </div>
            <div className="text-xs text-muted-foreground" dir="auto">{t("diffScore")}</div>
          </div>
          <div className="text-center">
            <div className={`text-4xl font-bold ${scoreColor(result.claimVerificationScore)}`}>
              {result.claimVerificationScore}
            </div>
            <div className="text-xs text-muted-foreground" dir="auto">{t("diffClaimScore")}</div>
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold" dir="auto">{result.formData.businessName}</h2>
          <p className="text-sm text-muted-foreground" dir="auto">{result.executiveSummary[language]}</p>
        </div>
      </div>

      {/* Tabbed Results */}
      <Tabs defaultValue="mechanism">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="mechanism" className="text-xs gap-1"><Sparkles className="h-3 w-3" />{t("diffTabMechanism")}</TabsTrigger>
          <TabsTrigger value="claims" className="text-xs gap-1"><ShieldCheck className="h-3 w-3" />{t("diffTabClaims")}</TabsTrigger>
          <TabsTrigger value="competitors" className="text-xs gap-1"><Map className="h-3 w-3" />{t("diffTabCompetitors")}</TabsTrigger>
          <TabsTrigger value="committee" className="text-xs gap-1"><Users className="h-3 w-3" />{t("diffTabCommittee")}</TabsTrigger>
          <TabsTrigger value="tradeoffs" className="text-xs gap-1"><Scale className="h-3 w-3" />{t("diffTabTradeoffs")}</TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs gap-1"><BarChart3 className="h-3 w-3" />{t("diffTabMetrics")}</TabsTrigger>
          <TabsTrigger value="report" className="text-xs gap-1"><FileText className="h-3 w-3" />{t("diffTabReport")}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Mechanism Statement */}
        <TabsContent value="mechanism" className="mt-4 space-y-4">
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardContent className="p-6 space-y-4">
              {result.mechanismStatement.oneLiner[language] && (
                <blockquote className="text-xl font-bold text-foreground border-s-4 border-amber-500 ps-4" dir="auto">
                  {result.mechanismStatement.oneLiner[language]}
                </blockquote>
              )}
              {result.mechanismStatement.mechanism && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1" dir="auto">{tx({ he: "מנגנון:", en: "Mechanism:" }, language)}</div>
                  <p className="text-sm" dir="auto">{result.mechanismStatement.mechanism}</p>
                </div>
              )}
              {result.mechanismStatement.proof && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1" dir="auto">{tx({ he: "הוכחה:", en: "Proof:" }, language)}</div>
                  <p className="text-sm" dir="auto">{result.mechanismStatement.proof}</p>
                </div>
              )}
              {result.mechanismStatement.antiStatement && (
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                  <div className="text-xs font-semibold text-destructive mb-1">{t("diffAntiStatement")}</div>
                  <p className="text-sm" dir="auto">{result.mechanismStatement.antiStatement}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hybrid Category */}
          {result.hybridCategory.name[language] && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{tx({ he: "קטגוריה היברידית", en: "Hybrid Category" }, language)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="text-sm">{result.hybridCategory.name[language]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground" dir="auto">{result.hybridCategory.description[language]}</p>
                {result.hybridCategory.whitespace && (
                  <p className="text-xs text-accent mt-1">{tx({ he: "חלל לבן:", en: "Whitespace:" }, language)} {result.hybridCategory.whitespace}</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Claim Audit */}
        <TabsContent value="claims" className="mt-4 space-y-3">
          {result.gapAnalysis.map((gap, i) => (
            <Card key={i} className={`border-s-4 ${gap.status === "verified" ? "border-s-accent" : gap.status === "weak" ? "border-s-amber-500" : "border-s-destructive"}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <Badge variant={gap.status === "verified" ? "default" : "outline"} className={`text-xs shrink-0 ${gap.status === "verified" ? "bg-accent" : gap.status === "weak" ? "bg-amber-500" : "bg-destructive"} text-white`}>
                  {t(gap.status === "verified" ? "diffVerified" : gap.status === "weak" ? "diffWeak" : "diffEmpty")}
                </Badge>
                <div>
                  <p className="text-sm font-medium" dir="auto">{gap.claim}</p>
                  <p className="text-xs text-muted-foreground mt-1" dir="auto">{gap.recommendation[language]}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab 3: Competitor Map */}
        <TabsContent value="competitors" className="mt-4 space-y-3">
          {result.competitorMap.map((comp, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">{comp.name}</span>
                  <Badge variant={comp.threat_level === "high" ? "destructive" : comp.threat_level === "medium" ? "default" : "outline"} className="text-xs">
                    {comp.threat_level}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{tx({ he: "ארכיטיפ:", en: "Archetype:" }, language)} {comp.archetype}</p>
                {comp.counter_strategy && (
                  <div className="rounded-lg bg-accent/5 border border-accent/20 p-2.5">
                    <div className="text-xs text-accent font-medium mb-1">{tx({ he: "אסטרטגיית נגד:", en: "Counter-strategy:" }, language)}</div>
                    <p className="text-xs" dir="auto">{comp.counter_strategy}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab 4: Committee Narratives */}
        <TabsContent value="committee" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.committeeNarratives.map((role, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Badge className="text-xs mb-2">{role.role}</Badge>
                  <p className="text-xs text-muted-foreground mb-1">{role.primaryConcern}</p>
                  {role.narrative && (
                    <p className="text-sm" dir="auto">{role.narrative}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 5: Tradeoffs */}
        <TabsContent value="tradeoffs" className="mt-4 space-y-3">
          {result.tradeoffDeclarations.map((td, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <div>
                  <div className="text-xs text-destructive font-medium">{tx({ he: "חולשה:", en: "Weakness:" }, language)}</div>
                  <p className="text-sm" dir="auto">{td.weakness}</p>
                </div>
                <div>
                  <div className="text-xs text-accent font-medium">{tx({ he: "מסגור מחדש:", en: "Reframe:" }, language)}</div>
                  <p className="text-sm" dir="auto">{td.reframe}</p>
                </div>
                <div>
                  <div className="text-xs text-primary font-medium">{tx({ he: "מי נהנה:", en: "Who benefits:" }, language)}</div>
                  <p className="text-sm" dir="auto">{td.beneficiary}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab 6: Contrary Metrics */}
        <TabsContent value="metrics" className="mt-4 space-y-3">
          {result.contraryMetrics.map((metric, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" dir="auto">{metric.name[language]}</span>
                  <Badge variant="outline" className="text-xs">{tx({ he: "יעד:", en: "Target:" }, language)} {metric.target}</Badge>
                </div>
                <p className="text-sm text-muted-foreground" dir="auto">{metric.description[language]}</p>
                <p className="text-xs text-primary mt-1">{tx({ he: "למה הפוך:", en: "Why contrary:" }, language)} {metric.whyContrary}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab 7: Full Report */}
        <TabsContent value="report" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{tx({ he: "סיכום מנהלים", en: "Executive Summary" }, language)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm" dir="auto">{result.executiveSummary[language]}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("diffNextSteps")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.nextSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Badge variant={step.priority === "high" ? "destructive" : "outline"} className="text-xs shrink-0">{step.priority}</Badge>
                  <div>
                    <p className="text-sm" dir="auto">{step.action[language]}</p>
                    <p className="text-xs text-muted-foreground">{step.timeframe}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Continue to Marketing Plan — Primary CTA */}
      <Card className="border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-transparent">
        <CardContent className="p-6 text-center space-y-3">
          <h3 className="text-lg font-bold" dir="auto">
            {tx({ he: "הבידול שלך מוכן — בוא נבנה תוכנית שיווק מותאמת", en: "Your differentiation is ready — let's build a tailored marketing plan" }, language)}
          </h3>
          <p className="text-sm text-muted-foreground" dir="auto">
            {isHe
              ? "כל הסקריפטים, הנוסחאות וה-hooks ישתמשו בבידול שגילינו"
              : "All scripts, formulas, and hooks will use the differentiation we discovered"}
          </p>
          <Button size="lg" onClick={() => { window.location.href = "/wizard"; }} className="gap-2 funnel-gradient border-0 text-accent-foreground">
            <Sparkles className="h-5 w-5" />
            {tx({ he: "המשך לתוכנית שיווק →", en: "Continue to Marketing Plan →" }, language)}
          </Button>
        </CardContent>
      </Card>

      {/* Secondary: Back */}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          {tx({ he: "חזור לתחילת התהליך", en: "Back to Start" }, language)}
        </Button>
      </div>
    </div>
  );
};

export default DifferentiationResultView;
