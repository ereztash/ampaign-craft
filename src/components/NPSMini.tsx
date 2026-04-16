// ═══════════════════════════════════════════════
// NPSMini — D7 Net Promoter Score micro-survey
// Shows once at D7 post-activation.
// NPS ≥ 9 → routes to referral CTA (Ref6 hook).
// ═══════════════════════════════════════════════
import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Analytics } from "@/lib/analytics";

const NPS_KEY = "funnelforge-nps-shown";

export function useNPSEligibility(): boolean {
  try {
    const shown = localStorage.getItem(NPS_KEY);
    if (shown) return false;

    // D7 gate: account created ≥ 7 days ago
    const createdRaw = localStorage.getItem("funnelforge-created-at");
    if (!createdRaw) return false;
    const createdAt = new Date(createdRaw).getTime();
    const daysSince = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    return daysSince >= 7;
  } catch {
    return false;
  }
}

interface NPSMiniProps {
  userId?: string;
  onPromoter?: () => void; // called when NPS ≥ 9 (Ref6)
  onDismiss: () => void;
}

export function NPSMini({ userId, onPromoter, onDismiss }: NPSMiniProps) {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (score: number) => {
    setSelected(score);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
    try {
      localStorage.setItem(NPS_KEY, "1");
    } catch { /* ignore */ }

    // Track NPS event
    if (userId) {
      Analytics.track("aarrr.retention.nps_submitted", { score: selected, userId }).catch(() => {});
    }

    // Ref6: promoter routing
    if (selected >= 9 && onPromoter) {
      setTimeout(onPromoter, 800);
    } else {
      setTimeout(onDismiss, 1200);
    }
  };

  if (submitted) {
    return (
      <Card className="mb-6 border-accent/30 bg-accent/5">
        <CardContent className="p-4 text-center">
          <p className="text-sm font-medium text-foreground" dir="auto">
            {isHe ? "תודה על המשוב! 🙏" : "Thank you for your feedback! 🙏"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-primary/30">
      <CardContent className="p-4">
        <p className="text-sm font-semibold text-foreground mb-3 text-center" dir="auto">
          {isHe
            ? "כמה סביר שתמליץ על FunnelForge לחבר או קולגה?"
            : "How likely are you to recommend FunnelForge to a friend or colleague?"}
        </p>
        <div className="flex justify-between gap-1 mb-3">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              onClick={() => handleSelect(n)}
              className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors min-w-[28px] ${
                selected === n
                  ? "bg-primary text-primary-foreground"
                  : n >= 9
                  ? "bg-accent/10 hover:bg-accent/20 text-accent"
                  : n >= 7
                  ? "bg-muted hover:bg-muted/80 text-foreground"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mb-3">
          <span>{isHe ? "בכלל לא" : "Not at all"}</span>
          <span>{isHe ? "בהחלט" : "Extremely"}</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            disabled={selected === null}
            onClick={handleSubmit}
          >
            {isHe ? "שלח" : "Submit"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            {isHe ? "לא עכשיו" : "Not now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
