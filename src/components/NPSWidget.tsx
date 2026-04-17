// NPS Widget — Net Promoter Score capture (0–10 scale).
// Triggers: ≥1 plan AND ≥14 days since first visit (earlier than PMF survey).
// Saves to Supabase `feedback` table as message: "NPS | score: N | lang: xx".
// Key: "funnelforge-nps-v1"

import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { Button } from "@/components/ui/button";
import { safeStorage } from "@/lib/safeStorage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SavedPlan } from "@/types/funnel";
import { track } from "@/lib/analytics";

const NPS_KEY = "funnelforge-nps-v1";
const FIRST_VISIT_KEY = "funnelforge-first-visit";
const MIN_PLANS = 1;
const MIN_DAYS = 14;

function shouldShowNPS(): boolean {
  if (safeStorage.getString(NPS_KEY)) return false;

  const plans = safeStorage.getJSON<SavedPlan[]>("funnelforge-plans", []);
  if (plans.length < MIN_PLANS) return false;

  const firstVisit = safeStorage.getString(FIRST_VISIT_KEY);
  if (!firstVisit) return false;
  const daysSince = (Date.now() - new Date(firstVisit).getTime()) / 86_400_000;
  return daysSince >= MIN_DAYS;
}

const SCORE_LABELS: Record<number, { color: string }> = {
  0: { color: "bg-red-100 border-red-300 text-red-700 hover:bg-red-200" },
  1: { color: "bg-red-100 border-red-300 text-red-700 hover:bg-red-200" },
  2: { color: "bg-red-100 border-red-300 text-red-700 hover:bg-red-200" },
  3: { color: "bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200" },
  4: { color: "bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200" },
  5: { color: "bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200" },
  6: { color: "bg-yellow-100 border-yellow-300 text-yellow-700 hover:bg-yellow-200" },
  7: { color: "bg-yellow-100 border-yellow-300 text-yellow-700 hover:bg-yellow-200" },
  8: { color: "bg-green-100 border-green-300 text-green-700 hover:bg-green-200" },
  9: { color: "bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200" },
  10: { color: "bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200" },
};

export function NPSWidget() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(shouldShowNPS()), 5000);
    return () => clearTimeout(timer);
  }, []);

  async function submit() {
    if (selected === null) return;
    safeStorage.setString(NPS_KEY, String(selected));

    const message = `NPS | score: ${selected} | lang: ${language}`;
    await supabase.from("feedback").insert({
      message,
      user_id: user?.id ?? null,
      page_url: window.location.pathname,
      user_agent: navigator.userAgent,
      email: null,
    });

    void track("aarrr.retention.pulse_opened", { npsScore: selected }, { userId: user?.id });

    setSubmitted(true);
    setTimeout(() => setVisible(false), 2500);
  }

  if (!visible) return null;

  const category = selected === null ? null : selected >= 9 ? "promoter" : selected >= 7 ? "passive" : "detractor";

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-border bg-card shadow-cor-4 p-5 space-y-4"
      dir={language === "he" ? "rtl" : "ltr"}
      role="dialog"
      aria-modal="true"
      aria-label={tx({ he: "סקר NPS", en: "NPS Survey" }, language)}
    >
      {submitted ? (
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-primary">
            {category === "promoter"
              ? tx({ he: "תודה! אנחנו שמחים שאתה מרוצה 🌟", en: "Thank you! We're glad you love it 🌟" }, language)
              : tx({ he: "תודה על המשוב! נמשיך לשפר 💪", en: "Thanks for your feedback! We'll keep improving 💪" }, language)}
          </p>
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              {tx({ he: "שאלה אחת בלבד", en: "Just one question" }, language)}
            </p>
            <p className="text-sm font-medium leading-snug">
              {tx(
                {
                  he: "עד כמה סביר שתמליץ על FunnelForge לחבר או עמית?",
                  en: "How likely are you to recommend FunnelForge to a friend or colleague?",
                },
                language,
              )}
            </p>
          </div>

          <div>
            <div className="flex gap-1 flex-wrap justify-center">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`w-8 h-8 text-xs font-medium rounded border transition-all ${
                    selected === i
                      ? SCORE_LABELS[i].color + " ring-2 ring-offset-1 ring-primary"
                      : SCORE_LABELS[i].color
                  }`}
                  aria-label={String(i)}
                  aria-pressed={selected === i}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 px-0.5">
              <span>{tx({ he: "כלל לא סביר", en: "Not at all likely" }, language)}</span>
              <span>{tx({ he: "סביר מאוד", en: "Extremely likely" }, language)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={selected === null} className="flex-1">
              {tx({ he: "שלח", en: "Submit" }, language)}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                safeStorage.setString(NPS_KEY, "dismissed");
                setVisible(false);
              }}
              className="text-muted-foreground"
            >
              {tx({ he: "לא עכשיו", en: "Later" }, language)}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
