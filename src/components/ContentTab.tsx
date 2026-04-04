import CopyLabTab from "@/components/CopyLabTab";
import NeuroStorytellingTab from "@/components/NeuroStorytellingTab";
import { useLanguage } from "@/i18n/LanguageContext";
import { neuroVectorColors } from "@/lib/colorSemantics";
import { FunnelResult } from "@/types/funnel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface ContentTabProps {
  result: FunnelResult;
  isSimplified: boolean;
}

const ContentTab = ({ result, isSimplified }: ContentTabProps) => {
  const { t, language } = useLanguage();

  return (
    <Tabs defaultValue="hooks">
      <TabsList className="h-9 w-full justify-start gap-1 bg-muted/50">
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
      </TabsList>

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
    </Tabs>
  );
};

export default ContentTab;
