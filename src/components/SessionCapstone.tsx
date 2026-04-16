// ═══════════════════════════════════════════════
// SessionCapstone — Peak-End Rule anchor
// Shown at end of Dashboard session (scroll bottom or timer).
// Research: Kahneman (2000) — the END of an experience dominates memory.
// ═══════════════════════════════════════════════
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";

interface SessionCapstoneProps {
  completedModules: number;
  totalModules: number;
  planCount: number;
  onDismiss: () => void;
}

export function SessionCapstone({
  completedModules,
  totalModules,
  planCount,
  onDismiss,
}: SessionCapstoneProps) {
  const { language } = useLanguage();
  const isHe = language === "he";

  const accomplishments: string[] = [];
  if (planCount > 0) {
    accomplishments.push(
      isHe
        ? `יצרת ${planCount} תוכניות שיווק`
        : `Created ${planCount} marketing plans`,
    );
  }
  if (completedModules > 0) {
    accomplishments.push(
      isHe
        ? `השלמת ${completedModules} מתוך ${totalModules} מודולים`
        : `Completed ${completedModules} of ${totalModules} modules`,
    );
  }
  if (accomplishments.length === 0) {
    accomplishments.push(isHe ? "ביקרת והתקדמת" : "You showed up and made progress");
  }

  return (
    <Card className="mb-6 border-accent/40 bg-gradient-to-br from-accent/10 via-background to-primary/5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20">
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-1" dir="auto">
                {tx({ he: "סיכום ביקור", en: "Session Wrap-up" }, language)}
              </p>
              <ul className="space-y-0.5">
                {accomplishments.map((a, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5" dir="auto">
                    <span className="text-accent">✓</span> {a}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs font-medium text-accent" dir="auto">
                {isHe
                  ? "כל ביקור מצמיח את העסק שלך — נראה אותך מחר."
                  : "Every visit grows your business — see you tomorrow."}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0"
            onClick={onDismiss}
            aria-label={tx({ he: "סגור", en: "Dismiss" }, language)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
