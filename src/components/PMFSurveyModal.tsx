// PMF Survey Modal — Sean Ellis Product-Market Fit measurement.
// Triggers once after user has ≥3 saved plans AND ≥7 days since first visit.
// Saves response to Supabase `feedback` table with type='pmf_survey'.
// Key question: "How would you feel if you could no longer use FunnelForge?"

import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { Button } from "@/components/ui/button";
import { safeStorage } from "@/lib/safeStorage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SavedPlan } from "@/types/funnel";

const PMF_SURVEY_KEY = "funnelforge-pmf-survey-v1";
const FIRST_VISIT_KEY = "funnelforge-first-visit";
const MIN_PLANS = 3;
const MIN_DAYS = 7;

type PMFAnswer = "very_disappointed" | "somewhat_disappointed" | "not_disappointed";

function shouldShowSurvey(): boolean {
  if (safeStorage.getString(PMF_SURVEY_KEY)) return false;

  const plans = safeStorage.getJSON<SavedPlan[]>("funnelforge-plans", []);
  if (plans.length < MIN_PLANS) return false;

  const firstVisit = safeStorage.getString(FIRST_VISIT_KEY);
  if (!firstVisit) {
    safeStorage.setString(FIRST_VISIT_KEY, new Date().toISOString());
    return false;
  }
  const daysSince = (Date.now() - new Date(firstVisit).getTime()) / 86_400_000;
  return daysSince >= MIN_DAYS;
}

export function PMFSurveyModal() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<PMFAnswer | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(shouldShowSurvey()), 3000);
    return () => clearTimeout(timer);
  }, []);

  async function submit() {
    if (!selected) return;
    safeStorage.setString(PMF_SURVEY_KEY, selected);

    const message = `PMF Survey | answer: ${selected} | lang: ${language}`;
    await supabase.from("feedback").insert({
      message,
      user_id: user?.id ?? null,
      page_url: window.location.pathname,
      user_agent: navigator.userAgent,
      email: null,
    });

    setSubmitted(true);
    setTimeout(() => setVisible(false), 2000);
  }

  if (!visible) return null;

  const options: { value: PMFAnswer; label: { he: string; en: string } }[] = [
    { value: "very_disappointed",     label: { he: "מאוד מאוכזב",      en: "Very disappointed" } },
    { value: "somewhat_disappointed", label: { he: "קצת מאוכזב",       en: "Somewhat disappointed" } },
    { value: "not_disappointed",      label: { he: "לא ממש מאוכזב",    en: "Not disappointed" } },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-border bg-card shadow-cor-4 p-5 space-y-4"
         dir={language === "he" ? "rtl" : "ltr"}>
      {submitted ? (
        <p className="text-sm font-medium text-center text-primary">
          {tx({ he: "תודה רבה! 🙏", en: "Thank you! 🙏" }, language)}
        </p>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              {tx({ he: "שאלה אחת קטנה", en: "One quick question" }, language)}
            </p>
            <p className="text-sm font-medium leading-snug">
              {tx(
                {
                  he: "איך היית מרגיש אם לא יכולת יותר להשתמש ב-FunnelForge?",
                  en: "How would you feel if you could no longer use FunnelForge?",
                },
                language,
              )}
            </p>
          </div>

          <div className="space-y-2">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`w-full text-sm text-right px-3 py-2 rounded-lg border transition-colors ${
                  selected === opt.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:bg-muted"
                }`}
              >
                {tx(opt.label, language)}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={!selected} className="flex-1">
              {tx({ he: "שלח", en: "Submit" }, language)}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                safeStorage.setString(PMF_SURVEY_KEY, "dismissed");
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
