import { useState } from "react";
import CopyLabTab from "@/components/CopyLabTab";
import NeuroStorytellingTab from "@/components/NeuroStorytellingTab";
import { useLanguage } from "@/i18n/LanguageContext";
import { neuroVectorColors } from "@/lib/colorSemantics";
import { FunnelResult } from "@/types/funnel";
import { analyzeCopy } from "@/engine/copyQAEngine";
import { scoreHebrewCopy, getHebrewCopyRules } from "@/lib/hebrewCopyOptimizer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Languages, Sparkles } from "lucide-react";
import { AICopyGenerator } from "@/components/AICopyGenerator";

interface ContentTabProps {
  result: FunnelResult;
  isSimplified: boolean;
}

const ContentTab = ({ result, isSimplified }: ContentTabProps) => {
  const { t, language } = useLanguage();
  const isHe = language === "he";
  const [copyText, setCopyText] = useState("");
  const [copyQA, setCopyQA] = useState<ReturnType<typeof analyzeCopy> | null>(null);
  const [hebrewScore, setHebrewScore] = useState<ReturnType<typeof scoreHebrewCopy> | null>(null);

  const runCopyAudit = () => {
    if (!copyText.trim()) return;
    setCopyQA(analyzeCopy(copyText));
    setHebrewScore(scoreHebrewCopy(copyText));
  };

  return (
    <Tabs defaultValue="hooks">
      <div className="overflow-x-auto -mx-1 px-1">
        <TabsList className="h-9 w-max min-w-full justify-start gap-1 bg-muted/50">
        <TabsTrigger value="hooks" className="text-xs px-3">
          {t("contentSubNavHooks")}
        </TabsTrigger>
        <TabsTrigger value="copylab" className="text-xs px-3">
          {t("contentSubNavCopyLab")}
        </TabsTrigger>
        {result.neuroStorytelling && (
          <TabsTrigger value="neurostory" className="text-xs px-3">
            {t("contentSubNavNeuro")}
          </TabsTrigger>
        )}
        <TabsTrigger value="copyqa" className="text-xs px-3 gap-1">
          <ShieldCheck className="h-3 w-3" />
          {isHe ? "בדיקת קופי" : "Copy QA"}
        </TabsTrigger>
        <TabsTrigger value="aicopy" className="text-xs px-3 gap-1">
          <Sparkles className="h-3 w-3" />
          {isHe ? "AI קופי" : "AI Copy"}
        </TabsTrigger>
      </TabsList>
      </div>

      {/* Hooks */}
      <TabsContent value="hooks" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>{isSimplified ? t("beginnerHooksTitle") : t("tabHooks")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {isSimplified ? t("beginnerHooksSubtitle") : t("hooksSubtitle")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(isSimplified ? result.hookTips.slice(0, 3) : result.hookTips).map((hook, i) => (
                <div key={i} className="rounded-xl border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                    <span className="font-semibold text-foreground">{hook.lawName[language]}</span>
                  </div>
                  <div className="mb-2 rounded-lg bg-muted/50 p-3">
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">{t("hookFormula")}:</div>
                    <p className="text-sm text-foreground">{hook.formula[language]}</p>
                  </div>
                  <div className="mb-2 rounded-lg bg-primary/5 p-3">
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">{t("hookExample")}:</div>
                    <p className="text-sm text-foreground italic">{hook.example[language]}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{t("hookChannels")}:</span>
                    {hook.channels.map((ch, j) => (
                      <Badge key={j} variant="outline" className="text-xs">{ch}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {isSimplified && (
              <p className="mt-4 text-center text-xs text-muted-foreground">{t("unlockFullView")}</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Copy Lab */}
      <TabsContent value="copylab" className="mt-4">
        {isSimplified ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("beginnerCopyLabTitle")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("beginnerCopyLabSubtitle")}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.copyLab.formulas.slice(0, 2).map((formula, i) => (
                  <div key={i} className="rounded-xl border p-4">
                    <div className="font-semibold text-foreground">{formula.name[language]}</div>
                    <div className="mt-2 rounded-lg bg-muted/50 p-3 font-mono text-sm">{formula.structure[language]}</div>
                    <div className="mt-2 rounded-lg bg-primary/5 p-3 text-sm italic text-foreground">{formula.example[language]}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">{t("unlockFullView")}</p>
            </CardContent>
          </Card>
        ) : (
          <CopyLabTab copyLab={result.copyLab} />
        )}
      </TabsContent>

      {/* Neuro-Storytelling */}
      {result.neuroStorytelling && (
        <TabsContent value="neurostory" className="mt-4">
          {isSimplified ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("beginnerNeuroTitle")}</CardTitle>
                <p className="text-sm text-muted-foreground">{t("beginnerNeuroSubtitle")}</p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {result.neuroStorytelling.vectors.map((v) => {
                    const colors = neuroVectorColors[v.id as keyof typeof neuroVectorColors];
                    return (
                    <div key={v.id} className={`rounded-xl border-2 p-4 text-center ${colors?.border || ""} ${colors?.bg || ""}`}>
                      <div className="text-3xl mb-2">{v.emoji}</div>
                      <div className="font-bold text-foreground">{v.name[language]}</div>
                      <p className="mt-2 text-sm text-muted-foreground">{v.copyApplication[language]}</p>
                    </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-center text-xs text-muted-foreground">{t("unlockFullView")}</p>
              </CardContent>
            </Card>
          ) : (
            <NeuroStorytellingTab data={result.neuroStorytelling} />
          )}
        </TabsContent>
      )}
      {/* Copy QA + Hebrew Optimizer */}
      <TabsContent value="copyqa" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {isHe ? "בדיקת איכות קופי + אופטימיזציה לעברית" : "Copy Quality Audit + Hebrew Optimization"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isHe ? "הדבק את הטקסט השיווקי שלך — נבדוק אותו מול 6 מדדים נוירו-פסיכולוגיים + 8 כללי עברית" : "Paste your marketing copy — we'll audit it against 6 neuro-psychological metrics + 8 Hebrew rules"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={copyText}
              onChange={(e) => setCopyText(e.target.value)}
              placeholder={isHe ? "הדבק כאן את הטקסט השיווקי שלך..." : "Paste your marketing copy here..."}
              className="min-h-[120px]"
              dir="auto"
            />
            <Button onClick={runCopyAudit} disabled={!copyText.trim()}>
              {isHe ? "בדוק עכשיו" : "Audit Now"}
            </Button>

            {copyQA && (
              <div className="space-y-4">
                {/* Score */}
                <div className="flex items-center gap-4">
                  <div className={`text-3xl font-bold ${copyQA.score >= 60 ? "text-accent" : copyQA.score >= 40 ? "text-amber-500" : "text-destructive"}`}>
                    {copyQA.score}/100
                  </div>
                  <span className="text-sm text-muted-foreground">{isHe ? "ציון קופי" : "Copy Score"}</span>
                  {hebrewScore && (
                    <>
                      <div className={`text-3xl font-bold ${hebrewScore.total >= 60 ? "text-accent" : hebrewScore.total >= 40 ? "text-amber-500" : "text-destructive"}`}>
                        {hebrewScore.total}/100
                      </div>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Languages className="h-3 w-3" />
                        {isHe ? "ציון עברית" : "Hebrew Score"}
                      </span>
                    </>
                  )}
                </div>

                {/* Risks */}
                {copyQA.risks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-destructive">{isHe ? "סיכונים שזוהו:" : "Risks detected:"}</h4>
                    {copyQA.risks.map((risk, i) => (
                      <div key={i} className={`rounded-lg border p-2.5 ${risk.severity === "high" ? "border-destructive/30 bg-destructive/5" : "border-amber-500/20"}`}>
                        <div className="text-xs font-medium text-foreground">{risk.message[language]}</div>
                        <div className="text-xs text-accent mt-1">{isHe ? "תיקון:" : "Fix:"} {risk.fix[language]}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hebrew breakdown */}
                {hebrewScore && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-muted-foreground">{isHe ? "פירוט עברית:" : "Hebrew breakdown:"}</h4>
                    {hebrewScore.breakdown.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs border-b pb-1">
                        <span className="text-muted-foreground">{item.rule}</span>
                        <span className="font-medium">{item.score}pts</span>
                        <span className="text-xs text-muted-foreground max-w-[50%] text-end">{item.tip[language]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* AI Copy Generator */}
      <TabsContent value="aicopy" className="mt-4">
        <AICopyGenerator funnelResult={result} />
      </TabsContent>
    </Tabs>
  );
};

export default ContentTab;
