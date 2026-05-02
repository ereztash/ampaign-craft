// ═══════════════════════════════════════════════
// Fake Door variant — Differentiation promise
//
// Single-purpose landing page that tests one promise:
//   "תוך 10 דקות יהיה לך משפט בידול שתשלח ללקוח"
//
// This is the cheapest way to get a behavioral signal from the world.
// We do NOT yet show the FunnelForge product — only the promise + email
// capture. The conversion event we care about: signup_completed against
// utm_campaign=oneliner-fakedoor.
//
// Hooked into the existing /request-beta-access edge function so we
// reuse the existing beta_waitlist Supabase table; the variant ID is
// stuffed into utm_campaign so we can segment in the dashboard.
// ═══════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { track, getUTM } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/i18n/tx";
import { Sparkles, Check, ChevronLeft, Clock, MessageSquare, Target } from "lucide-react";

const VARIANT_ID = "oneliner-fakedoor";

export default function PublicLandingDifferentiation() {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fire landing_view exactly once per mount, tagged with the variant.
  // This is the denominator for the Fake Door conversion metric.
  useEffect(() => {
    void track("aarrr.acquisition.landing_view", {
      variant: VARIANT_ID,
      promise: "10-min-oneliner",
    }, { uiOnly: true });
  }, []);

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);

    // Merge any captured UTM with the variant tag. utm_campaign is set even
    // if the visitor didn't arrive with one — so all Fake Door signups land
    // in the same dashboard slice.
    const utm = { ...getUTM(), utm_campaign: VARIANT_ID };

    try {
      const { error: fnError } = await supabase.functions.invoke("request-beta-access", {
        body: { email: email.trim(), utm, meta: { businessName: businessName.trim(), variant: VARIANT_ID } },
      });
      if (fnError) throw fnError;
      setSubmitted(true);
      void track("aarrr.acquisition.signup_completed", {
        variant: VARIANT_ID,
        hasBusinessName: businessName.trim().length > 0,
      }, { uiOnly: true });
    } catch {
      setError(isHe ? "משהו השתבש, נסה שוב" : "Something went wrong, please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background" dir={isHe ? "rtl" : "ltr"}>
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="FunnelForge home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="font-bold text-foreground">FunnelForge</span>
          </button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate("/wizard")}
            className="gap-1 text-sm"
          >
            {tx({ he: "כניסה", en: "Sign in" }, language)}
            {isHe ? <ChevronLeft className="h-4 w-4" /> : null}
          </Button>
        </div>
      </header>

      {/* Hero — single promise, single CTA, no other navigation */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4 pt-10 pb-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-2xl text-center space-y-6">
          <Badge variant="secondary" className="text-xs">
            {tx({ he: "Beta · בעלי עסקים בלבד", en: "Beta · business owners only" }, language)}
          </Badge>

          <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-foreground" dir="auto">
            {isHe
              ? "10 דקות. משפט בידול אחד. שתעז לשלוח ללקוח."
              : "10 minutes. One differentiation line. Bold enough to send."}
          </h1>

          <p className="text-lg text-muted-foreground" dir="auto">
            {isHe
              ? "במקום עוד סדנת פוזישנינג של חודש — תקבל משפט שתעתיק לפרופיל הלינקדאין שלך, לפתיחת שיחת מכירה, או להצעת מחיר. כתוב בעברית, מבוסס על העסק שלך."
              : "Instead of another month-long positioning workshop — get a sentence you can paste into your LinkedIn, your sales opener, or your proposal. Hebrew-first, grounded in your business."}
          </p>

          {/* Three concrete promises — what the 10 minutes get you */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {[
              {
                icon: Clock,
                title: tx({ he: "10 דקות", en: "10 minutes" }, language),
                desc: tx({ he: "5 שאלות ממוקדות, לא שאלון של שעה", en: "5 focused questions, not an hour-long form" }, language),
              },
              {
                icon: Target,
                title: tx({ he: "משפט אחד", en: "One sentence" }, language),
                desc: tx({ he: "לא דוח של 12 עמודים. שורה. מוכנה לשליחה.", en: "Not a 12-page report. One line. Ready to send." }, language),
              },
              {
                icon: MessageSquare,
                title: tx({ he: "מהשטח שלך", en: "From your context" }, language),
                desc: tx({ he: "מבוסס על העסק שלך, המתחרים, וציטוטי לקוחות אמיתיים", en: "Built on your business, competitors, and real customer quotes" }, language),
              },
            ].map((promise, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 text-start space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <promise.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="text-sm font-bold text-foreground" dir="auto">{promise.title}</div>
                <div className="text-xs text-muted-foreground" dir="auto">{promise.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Email capture — the only conversion surface on this page */}
      <section className="container mx-auto px-4 pb-20">
        <Card className="max-w-xl mx-auto border-primary/30 bg-primary/5">
          <CardContent className="p-8 space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground" dir="auto">
                {isHe
                  ? "רוצה לקבל משפט בידול לעסק שלך?"
                  : "Want a differentiation line for your business?"}
              </h2>
              <p className="text-sm text-muted-foreground" dir="auto">
                {isHe
                  ? "הרשם והתור הראשון לקבל גישה."
                  : "Sign up and we'll send the link first."}
              </p>
            </div>

            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
                  <Check className="h-6 w-6 text-accent" />
                </div>
                <p className="font-medium text-foreground text-center" dir="auto">
                  {isHe
                    ? "נרשמת. כשהמודול פתוח, תהיה הראשון לקבל לינק."
                    : "You're in. When the module opens, you'll be the first to get the link."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleWaitlist} className="space-y-3">
                <Input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={isHe ? "שם העסק (אופציונלי)" : "Business name (optional)"}
                  dir="auto"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isHe ? "האימייל שלך" : "Your email"}
                    className="flex-1"
                    dir="auto"
                  />
                  <Button type="submit" disabled={submitting} className="cta-warm shrink-0">
                    {submitting
                      ? (isHe ? "שולח..." : "Sending...")
                      : (isHe ? "תן לי גישה" : "Give me access")}
                  </Button>
                </div>
              </form>
            )}
            {error && <p className="text-sm text-destructive text-center" dir="auto">{error}</p>}

            <p className="text-xs text-muted-foreground text-center pt-2" dir="auto">
              {isHe
                ? "ללא כרטיס אשראי. ניתן להסיר את הרישום בכל עת."
                : "No credit card. Unsubscribe any time."}
            </p>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <p dir="auto">© 2026 FunnelForge · {isHe ? "עשוי בישראל" : "Made in Israel"}</p>
        </div>
      </footer>
    </main>
  );
}
