import { useLanguage } from "@/i18n/LanguageContext";
import { CopyLabData } from "@/types/funnel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CopyLabTabProps {
  copyLab: CopyLabData;
}

const CopyLabTab = ({ copyLab }: CopyLabTabProps) => {
  const { t, language } = useLanguage();
  const { readerProfile, formulas, writingTechniques } = copyLab;

  return (
    <div className="space-y-6">
      {/* Reader Profile */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              🧠
            </div>
            <div>
              <CardTitle className="text-lg">{t("readerProfile")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {readerProfile.name[language]} (Level {readerProfile.level})
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground">{readerProfile.description[language]}</p>

          <div className="rounded-lg bg-muted/50 p-4">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">{t("copyArchitecture")}:</div>
            <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
              {readerProfile.copyArchitecture[language]}
            </pre>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold text-muted-foreground">{t("effectivePrinciples")}:</div>
            <div className="space-y-1">
              {readerProfile.principles.map((p, i) => (
                <div key={i} className="text-sm text-foreground">{p[language]}</div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Copy Formulas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span role="img" aria-hidden="true">📝</span> {t("copyFormulas")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formulas.map((formula, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-foreground">{formula.name[language]}</span>
                <Badge variant="secondary" className="text-xs">{formula.conversionLift}</Badge>
              </div>
              <div className="mb-2 text-xs text-muted-foreground">{t("formulaOrigin")}: {formula.origin}</div>

              <div className="mb-2 rounded-lg bg-muted/50 p-3">
                <div className="mb-1 text-xs font-semibold text-muted-foreground">{t("formulaStructure")}:</div>
                <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
                  {formula.structure[language]}
                </pre>
              </div>

              <div className="mb-2 rounded-lg bg-primary/5 p-3">
                <div className="mb-1 text-xs font-semibold text-muted-foreground">{t("hookExample")}:</div>
                <pre className="whitespace-pre-wrap text-sm text-foreground italic leading-relaxed">
                  {formula.example[language]}
                </pre>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{t("formulaBestFor")}:</span>
                {formula.bestFor.map((ch, j) => (
                  <span key={j} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{ch}</span>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Writing Techniques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span role="img" aria-hidden="true">⚡</span> {t("writingTechniques")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {writingTechniques.map((tech, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-foreground">{tech.name[language]}</span>
                <Badge variant="outline" className="text-xs">{tech.metric}</Badge>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">{tech.description[language]}</p>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-primary/5 p-3">
                  <div className="mb-1 text-xs font-semibold text-primary">{t("doThis")}:</div>
                  <p className="text-sm text-foreground">{tech.doExample[language]}</p>
                </div>
                <div className="rounded-lg bg-destructive/5 p-3">
                  <div className="mb-1 text-xs font-semibold text-destructive">{t("dontDoThis")}:</div>
                  <p className="text-sm text-foreground">{tech.dontExample[language]}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default CopyLabTab;
