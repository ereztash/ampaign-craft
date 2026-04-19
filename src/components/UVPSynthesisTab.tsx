import { useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { FunnelResult } from "@/types/funnel";
import { DifferentiationResult } from "@/types/differentiation";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { synthesizeUVP } from "@/engine/uvpSynthesisEngine";
import { UVPFormatCard } from "@/components/UVPFormatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/i18n/tx";
import { AlertTriangle, Lightbulb, TrendingUp } from "lucide-react";

interface UVPSynthesisTabProps {
  result: FunnelResult;
  diffResult: DifferentiationResult | null;
}

const DISC_TONE_LABELS = {
  roi: { he: "ROI. ממוקד תוצאות", en: "ROI. Results-focused" },
  social: { he: "חברתי. ממוקד קהילה", en: "Social. Community-focused" },
  stability: { he: "יציבות. ממוקד בטחון", en: "Stability. Certainty-focused" },
  precision: { he: "דיוק. ממוקד נתונים", en: "Precision. Data-focused" },
} as const;

const SCORE_COLOR = (score: number) => {
  if (score >= 70) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 45) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
};

const UVPSynthesisTab = ({ result, diffResult }: UVPSynthesisTabProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";

  const ukg = useMemo(
    () => buildUserKnowledgeGraph(result.formData, diffResult ?? undefined),
    [result.formData, diffResult],
  );

  const uvp = useMemo(
    () => synthesizeUVP({ diffResult, copyLab: result.copyLab, ukg }),
    [diffResult, result.copyLab, ukg],
  );

  const variants = [
    uvp.oneLiner,
    uvp.linkedInBio,
    uvp.elevatorPitch,
    uvp.adHeadline,
    uvp.emailSubject,
  ];

  return (
    <div className="space-y-5">
      {/* No diffResult nudge */}
      {!diffResult && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800" dir="auto">
              {isHe
                ? "השלם את מודול הדיפרנציאציה כדי לקבל UVP מדויק יותר המבוסס על המנגנון הייחודי שלך."
                : "Complete the differentiation module to get a more precise UVP based on your unique mechanism."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Score + Tone header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${SCORE_COLOR(uvp.differentiationScore)}`}>
          {tx({ he: "ציון דיפרנציאציה", en: "Differentiation Score" }, language)}: {uvp.differentiationScore}/100
        </div>
        <Badge variant="outline" className="text-xs">
          {tx({ he: "טון", en: "Tone" }, language)}: {DISC_TONE_LABELS[uvp.appliedTone][language]}
        </Badge>
        {uvp.mechanismAnchor && (
          <Badge variant="secondary" className="text-xs gap-1">
            <TrendingUp className="h-3 w-3" />
            {uvp.mechanismAnchor}
          </Badge>
        )}
      </div>

      {/* UVP cards grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {variants.map((v) => (
          <UVPFormatCard key={v.format} variant={v} />
        ))}
      </div>

      {/* Improvement tips */}
      {uvp.improvementTips.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              {tx({ he: "טיפים לשיפור ה-UVP", en: "UVP Improvement Tips" }, language)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {uvp.improvementTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" dir="auto">
                  <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                  <span>{tip[language]}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UVPSynthesisTab;
