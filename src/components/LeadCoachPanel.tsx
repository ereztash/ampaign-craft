// LeadCoachPanel — renders the 3 research-based recommendations
// (Approach / Timing / Leverage). Output of leadCoachEngine.

import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/i18n/tx";
import { Sparkles, Compass, Clock, Target } from "lucide-react";
import type { LeadRecommendation, RecommendationCategory, Framework } from "@/engine/leadCoachEngine";

const CATEGORY_META: Record<RecommendationCategory, {
  he: string; en: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  approach: { he: "Approach — איך לדבר", en: "Approach — how to talk", Icon: Compass, color: "text-blue-600" },
  timing:   { he: "Timing — מה הצעד הבא",  en: "Timing — what's next",  Icon: Clock,   color: "text-amber-600" },
  leverage: { he: "Leverage — מה להציע",   en: "Leverage — what to offer", Icon: Target, color: "text-emerald-600" },
};

const FRAMEWORK_LABEL: Record<Framework, string> = {
  DISC: "DISC", Cialdini: "Cialdini", Hormozi: "Hormozi",
  Challenger: "Challenger", SPIN: "SPIN", Sandler: "Sandler",
};

interface Props {
  recommendations: LeadRecommendation[];
  loading: boolean;
}

export function LeadCoachPanel({ recommendations, loading }: Props) {
  const { language } = useLanguage();
  const isHe = language === "he";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          {tx({ he: "Lead Coach — 3 המלצות מבוססות מחקר", en: "Lead Coach — 3 research-based recommendations" }, language)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <p className="text-sm text-muted-foreground" dir="auto">
            {tx({ he: "מכין המלצות...", en: "Preparing recommendations..." }, language)}
          </p>
        )}
        {!loading && recommendations.length === 0 && (
          <p className="text-sm text-muted-foreground" dir="auto">
            {tx({ he: "אין עדיין המלצות עבור הליד הזה.", en: "No recommendations yet for this lead." }, language)}
          </p>
        )}
        {!loading && recommendations.map((rec, idx) => {
          const meta = CATEGORY_META[rec.category];
          const Icon = meta.Icon;
          return (
            <div key={`${rec.category}-${idx}`} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 ${meta.color}`} />
                  <span className={`text-xs font-semibold ${meta.color}`} dir="auto">
                    {isHe ? meta.he : meta.en}
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                  {FRAMEWORK_LABEL[rec.framework]}
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground" dir="auto">
                {isHe ? rec.titleHe : rec.titleEn}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed" dir="auto">
                {isHe ? rec.bodyHe : rec.bodyEn}
              </p>
              <p className="text-[11px] text-muted-foreground/80 italic border-t pt-1.5" dir="auto">
                {isHe ? rec.citationHe : rec.citationEn}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
