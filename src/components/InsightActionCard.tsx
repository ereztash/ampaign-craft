import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import type { UserState } from "@/lib/userStateClassifier";

export type { UserState };
export type ConfidenceLevel = "stable" | "needs_data" | "intake_only";
export type CheckAction = "accept" | "reject" | "refine";

export interface CopyItem {
  label: { he: string; en: string };
  text: { he: string; en: string };
}

export interface CheckOption {
  label: { he: string; en: string };
  action: CheckAction;
}

export interface InsightActionCardProps {
  module: { he: string; en: string };
  answer: { he: string; en: string };
  why: { he: string; en: string };
  confidence: ConfidenceLevel;
  confidenceReason: { he: string; en: string };
  useItNarrative?: { he: string; en: string };
  useItCopy?: CopyItem[];
  checkOptions: CheckOption[];
  drillDown?: React.ReactNode;
  userState?: UserState;
  onCheck: (action: CheckAction) => void;
}

const CONFIDENCE_LABEL: Record<ConfidenceLevel, { he: string; en: string }> = {
  stable:      { he: "יציב", en: "Stable" },
  needs_data:  { he: "חסר מידע", en: "Needs data" },
  intake_only: { he: "מבוסס על השאלון בלבד", en: "Intake-only" },
};

const CONFIDENCE_COLOR: Record<ConfidenceLevel, string> = {
  stable:      "bg-accent/10 text-accent border-accent/20",
  needs_data:  "bg-amber-500/10 text-amber-600 border-amber-500/20",
  intake_only: "bg-muted text-muted-foreground border-muted",
};

const CHECK_PROMPT: Record<UserState, { he: string; en: string }> = {
  confused:     { he: "זה מדויק לך?", en: "Does this feel right?" },
  resistant:    { he: "מה מרגיש לא נכון?", en: "What feels off?" },
  ready:        { he: "האם להמשיך?", en: "Ready to go?" },
  disbelieving: { he: "מה צריך להשתנות כדי שזה יהיה נכון?", en: "What would need to be true?" },
};

export function InsightActionCard({
  module,
  answer,
  why,
  confidence,
  confidenceReason,
  useItNarrative,
  useItCopy,
  checkOptions,
  drillDown,
  userState = "ready",
  onCheck,
}: InsightActionCardProps) {
  const { language } = useLanguage();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const showConfidence = userState !== "confused";

  const answerText = answer[language];
  const displayAnswer =
    userState === "resistant"
      ? tx({ he: `מה אם: ${answerText}`, en: `What if: ${answerText}` }, language)
      : answerText;

  function copyText(text: string, idx: number) {
    navigator.clipboard.writeText(text).catch(() => undefined);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-6 space-y-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" dir="auto">
          {module[language]}
        </div>

        {/* ANSWER */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1.5" dir="auto">
            {tx({ he: "תשובה:", en: "Answer:" }, language)}
          </div>
          <blockquote
            className="text-lg font-bold text-foreground border-s-4 border-primary ps-4"
            dir="auto"
          >
            {displayAnswer}
          </blockquote>
        </div>

        {/* WHY */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1" dir="auto">
            {tx({ he: "למה:", en: "Why:" }, language)}
          </div>
          <p className="text-sm" dir="auto">{why[language]}</p>
        </div>

        {/* CONFIDENCE — hidden when userState = confused */}
        {showConfidence && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn("text-xs", CONFIDENCE_COLOR[confidence])}
            >
              {CONFIDENCE_LABEL[confidence][language]}
            </Badge>
            <span className="text-xs text-muted-foreground" dir="auto">
              {confidenceReason[language]}
            </span>
          </div>
        )}

        {/* USE IT */}
        {(useItNarrative || (useItCopy && useItCopy.length > 0)) && (
          <div className="rounded-lg bg-primary/5 border border-primary/15 p-4 space-y-3">
            <div className="text-xs font-semibold text-primary" dir="auto">
              {tx({ he: "השתמש בזה:", en: "Use it:" }, language)}
            </div>
            {useItNarrative && (
              <p className="text-sm" dir="auto">{useItNarrative[language]}</p>
            )}
            {useItCopy && useItCopy.length > 0 && (
              <div className="space-y-2">
                {useItCopy.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground" dir="auto">
                      {item.label[language]}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 shrink-0"
                      onClick={() => copyText(item.text[language], idx)}
                    >
                      {copiedIdx === idx
                        ? <Check className="h-3 w-3" />
                        : <Copy className="h-3 w-3" />}
                      {copiedIdx === idx
                        ? tx({ he: "הועתק", en: "Copied" }, language)
                        : tx({ he: "העתק", en: "Copy" }, language)}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHECK */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="text-xs font-semibold text-muted-foreground" dir="auto">
            {CHECK_PROMPT[userState][language]}
          </div>
          <div className="flex flex-wrap gap-2">
            {checkOptions.map((opt, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => onCheck(opt.action)}
              >
                {opt.label[language]}
              </Button>
            ))}
          </div>
        </div>

        {/* DRILL DOWN — inline, passed as ReactNode from parent */}
        {drillDown && (
          <div className="pt-2 border-t border-border/40">{drillDown}</div>
        )}
      </CardContent>
    </Card>
  );
}
