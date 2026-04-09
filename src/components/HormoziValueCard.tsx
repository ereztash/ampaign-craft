import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { HormoziValueResult } from "@/types/funnel";

interface HormoziValueCardProps {
  data: HormoziValueResult;
}

const GRADE_CONFIG = {
  irresistible: { color: "bg-green-500", label: { he: "בלתי ניתן לסירוב", en: "Irresistible" } },
  strong: { color: "bg-blue-500", label: { he: "חזק", en: "Strong" } },
  average: { color: "bg-yellow-500", label: { he: "ממוצע", en: "Average" } },
  weak: { color: "bg-red-500", label: { he: "חלש", en: "Weak" } },
} as const;

const DIMENSION_LABELS = {
  dreamOutcome: { he: "תוצאה חלומית", en: "Dream Outcome" },
  perceivedLikelihood: { he: "סיכוי נתפס", en: "Perceived Likelihood" },
  timeDelay: { he: "השהיית זמן", en: "Time Delay" },
  effortSacrifice: { he: "מאמץ והקרבה", en: "Effort & Sacrifice" },
} as const;

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-foreground">{label}</span>
        <span className="font-medium text-muted-foreground">{score}/100</span>
      </div>
      <Progress value={score} className={`h-2.5 ${color}`} />
    </div>
  );
}

export function HormoziValueCard({ data }: HormoziValueCardProps) {
  const { language } = useLanguage();
  const grade = GRADE_CONFIG[data.offerGrade];

  const dimensions = [
    { key: "dreamOutcome" as const, dim: data.dreamOutcome, color: "bg-purple-100 dark:bg-purple-900/40" },
    { key: "perceivedLikelihood" as const, dim: data.perceivedLikelihood, color: "bg-blue-100 dark:bg-blue-900/40" },
    { key: "timeDelay" as const, dim: data.timeDelay, color: "bg-amber-100 dark:bg-amber-900/40" },
    { key: "effortSacrifice" as const, dim: data.effortSacrifice, color: "bg-rose-100 dark:bg-rose-900/40" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {language === "he" ? "משוואת ערך הורמוזי" : "Hormozi Value Equation"}
          </CardTitle>
          <Badge className={`${grade.color} text-white`}>
            {grade.label[language]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground" dir="auto">
          {data.valueEquationDisplay[language]}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="text-center py-2">
          <span className="text-3xl font-bold">{data.overallScore}</span>
          <span className="text-muted-foreground text-lg">/100</span>
        </div>

        {/* 4 Dimension Bars */}
        <div className="space-y-3">
          {dimensions.map(({ key, dim }) => (
            <ScoreBar
              key={key}
              label={DIMENSION_LABELS[key][language]}
              score={dim.score}
              color=""
            />
          ))}
        </div>

        {/* Optimization Priority */}
        <div className="rounded-lg border p-4 bg-primary/5 dark:bg-primary/10">
          <p className="text-sm font-semibold mb-1 text-foreground" dir="auto">
            {language === "he" ? "עדיפות לשיפור:" : "Optimization Priority:"}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed" dir="auto">
            {data.optimizationPriority[language]}
          </p>
        </div>

        {/* Dimension Details with Tips */}
        <div className="space-y-4">
          {dimensions.map(({ key, dim, color }) => (
            dim.tips.length > 0 && (
              <div key={key} className={`rounded-lg p-4 ${color} border border-black/5 dark:border-white/10`}>
                <p className="text-base font-semibold mb-1.5 text-foreground" dir="auto">
                  {DIMENSION_LABELS[key][language]}
                </p>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed" dir="auto">
                  {dim.analysis[language]}
                </p>
                <ul className="space-y-2">
                  {dim.tips.map((tip, i) => (
                    <li key={i} className="text-sm leading-relaxed text-foreground" dir="auto">
                      {language === "he" ? "• " : "• "}{tip[language]}
                    </li>
                  ))}
                </ul>
              </div>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
