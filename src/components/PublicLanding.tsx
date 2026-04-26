import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { getUTM } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/i18n/tx";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  Sparkles, ArrowDown, Check, ChevronLeft,
  BarChart3, Crosshair, TrendingUp, DollarSign, Heart,
  Users, Zap,
} from "lucide-react";

// Real: LinkedIn community followers (stated by founder)
const LINKEDIN_COMMUNITY = 4400;

export default function PublicLanding() {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mp = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);

    const utm = getUTM();

    try {
      const { error: fnError } = await supabase.functions.invoke("request-beta-access", {
        body: { email: email.trim(), utm },
      });
      if (fnError) throw fnError;
      setSubmitted(true);
    } catch {
      setError(isHe ? "משהו השתבש, נסה שוב" : "Something went wrong, please try again");
    } finally {
      setSubmitting(false);
    }
  }

  const modules = [
    { icon: Crosshair, color: "text-amber-500", title: tx({ he: "בידול", en: "Differentiation" }, language) },
    { icon: BarChart3,  color: "text-primary",   title: tx({ he: "שיווק",  en: "Marketing" },       language) },
    { icon: TrendingUp, color: "text-accent",    title: tx({ he: "מכירות", en: "Sales" },            language) },
    { icon: DollarSign, color: "text-emerald-500", title: tx({ he: "תמחור", en: "Pricing" },         language) },
    { icon: Heart,      color: "text-pink-500",  title: tx({ he: "שימור",  en: "Retention" },        language) },
  ];

  const steps = [
    {
      step: "1",
      title: tx({ he: "ספר לנו על העסק", en: "Tell us about your business" }, language),
      desc:  tx({ he: "2-5 דקות. שאלות ממוקדות ללא בלבול", en: "2-5 min. Focused questions, no fluff" }, language),
    },
    {
      step: "2",
      title: tx({ he: "קבל אסטרטגיה מותאמת", en: "Get a tailored strategy" }, language),
      desc:  tx({ he: "AI שמבין שוק ישראלי + מדע התנהגותי", en: "AI that understands Israeli market + behavioral science" }, language),
    },
    {
      step: "3",
      title: tx({ he: "בצע והצמח", en: "Execute & grow" }, language),
      desc:  tx({ he: "סקריפטים מוכנים להעתקה. פשוט תתחיל", en: "Copy-paste scripts. Just start" }, language),
    },
  ];

  return (
    <main className="min-h-screen bg-background" dir={isHe ? "rtl" : "ltr"}>
      {/* ── Nav bar ── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="font-bold text-foreground">FunnelForge</span>
          </div>
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

      {/* ── Hero ── */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4 pt-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <motion.div {...mp} className="relative z-10 max-w-2xl text-center">
          {/* Social proof badge — LinkedIn community (real number, stated by founder) */}
          <motion.div
            {...(reducedMotion ? {} : { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 } })}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm text-primary"
          >
            <Users className="h-4 w-4" />
            {isHe
              ? `${LINKEDIN_COMMUNITY.toLocaleString()}+ בעלי עסקים בקהילת LinkedIn`
              : `${LINKEDIN_COMMUNITY.toLocaleString()}+ SMB owners in our LinkedIn community`}
          </motion.div>

          {/* Headline — cortisol hook */}
          <h1
            className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl"
            dir="auto"
          >
            {tx(
              {
                he: "שיווק שעובד, לא ניחושים",
                en: "Marketing that works, not guesses",
              },
              language
            )}
          </h1>

          {/* Sub-headline — oxytocin empathy */}
          <p className="mb-8 text-lg text-muted-foreground sm:text-xl max-w-lg mx-auto" dir="auto">
            {isHe
              ? "FunnelForge בונה לך תוכנית שיווק, מכירות ותמחור מותאמת אישית לתעשייה שלך תוך 5 דקות."
              : "FunnelForge builds your marketing, sales, and pricing plan tailored to your industry in 5 minutes."}
          </p>

          {/* Primary CTA — dopamine */}
          <div className="flex flex-col items-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate("/wizard")}
              className="gap-2 text-lg px-10 py-6 rounded-xl cta-warm shadow-lg"
            >
              <Zap className="h-5 w-5" />
              {tx({ he: "בנה את התוכנית שלי - חינם", en: "Build My Plan - Free" }, language)}
            </Button>
            <p className="text-xs text-muted-foreground" dir="auto">
              {isHe
                ? "ללא כרטיס אשראי · 5 דקות · ייצוא PDF מיידי"
                : "No credit card · 5 minutes · Instant PDF export"}
            </p>
          </div>
        </motion.div>

        <motion.div
          {...(reducedMotion
            ? {}
            : { animate: { y: [0, 8, 0] }, transition: { repeat: Infinity, duration: 2 } })}
          className="mt-14"
        >
          <ArrowDown className="h-6 w-6 text-muted-foreground mx-auto" />
        </motion.div>
      </section>

      {/* ── 5 Modules strip ── */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex flex-wrap justify-center gap-3">
          {modules.map((mod, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"
            >
              <mod.icon className={`h-4 w-4 ${mod.color}`} />
              {mod.title}
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="container mx-auto px-4 py-16">
        <motion.h2 {...mp} className="text-2xl font-bold text-center text-foreground mb-10" dir="auto">
          {tx({ he: "שלושה צעדים לתוצאות", en: "Three steps to results" }, language)}
        </motion.h2>
        <div className="grid gap-8 sm:grid-cols-3 max-w-3xl mx-auto">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              {...(reducedMotion
                ? {}
                : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { delay: i * 0.1 } })}
              className="text-center"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {s.step}
              </div>
              <h3 className="font-bold text-foreground mb-1" dir="auto">{s.title}</h3>
              <p className="text-sm text-muted-foreground" dir="auto">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Before / After ── */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto grid gap-4 sm:grid-cols-2">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-5">
              <div className="text-sm font-bold text-destructive mb-3" dir="auto">
                🔴 {tx({ he: "בלי FunnelForge", en: "Without FunnelForge" }, language)}
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground" dir="auto">
                <li>✗ {tx({ he: "מבזבז שעות על פוסטים שלא מוכרים", en: "Hours on posts that don't convert" }, language)}</li>
                <li>✗ {tx({ he: "לא יודע כמה לגבות", en: "No idea what to charge" }, language)}</li>
                <li>✗ {tx({ he: "מאבד לקוחות למתחרים ולא יודע למה", en: "Losing clients to competitors" }, language)}</li>
                <li>✗ {tx({ he: "לא יודע מה עושים קודם", en: "Don't know what to do first" }, language)}</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="p-5">
              <div className="text-sm font-bold text-accent mb-3" dir="auto">
                🟢 {tx({ he: "עם FunnelForge", en: "With FunnelForge" }, language)}
              </div>
              <ul className="space-y-2 text-sm text-foreground" dir="auto">
                <li>✓ {tx({ he: "תוכנית שיווק מותאמת לתעשייה שלך", en: "Marketing plan tailored to your industry" }, language)}</li>
                <li>✓ {tx({ he: "תמחור מבוסס דאטה ישראלי אמיתי", en: "Pricing based on real Israeli data" }, language)}</li>
                <li>✓ {tx({ he: "סקריפטי מכירה מוכנים להעתקה", en: "Copy-paste sales scripts" }, language)}</li>
                <li>✓ {tx({ he: "תוכנית שימור לקוחות שעובדת", en: "Retention plan that works" }, language)}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Product facts strip ── */}
      <section className="container mx-auto px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <div className="grid gap-4 sm:grid-cols-3 text-center">
            {[
              {
                value: "4,400+",
                label: tx({ he: "בעלי עסקים בקהילת LinkedIn שלנו", en: "SMB owners in our LinkedIn community" }, language),
              },
              {
                value: "5",
                label: tx({ he: "מודולים: בידול · שיווק · מכירות · תמחור · שימור", en: "Modules: Differentiation · Marketing · Sales · Pricing · Retention" }, language),
              },
              {
                value: "∞",
                label: tx({ he: "תוכניות ניתן לשמור ולעדכן בכל עת", en: "Plans you can save and update any time" }, language),
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                {...(reducedMotion ? {} : { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { delay: i * 0.1 } })}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground" dir="auto">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Beta Waitlist CTA ── */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-xl mx-auto border-primary/20 bg-primary/5">
          <CardContent className="p-8 text-center space-y-4">
            <Badge variant="secondary" className="mb-2">
              {tx({ he: "Early Access", en: "Early Access" }, language)}
            </Badge>
            <h2 className="text-xl font-bold text-foreground" dir="auto">
              {isHe
                ? "הצטרפו לרשימת הגישה המוקדמת"
                : "Join the early access list"}
            </h2>
            <p className="text-sm text-muted-foreground" dir="auto">
              {isHe
                ? "גישה מלאה חינם לשלושה חודשים. ללא כרטיס אשראי."
                : "Full access free for three months. No credit card."}
            </p>

            {submitted ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
                  <Check className="h-6 w-6 text-accent" />
                </div>
                <p className="font-medium text-foreground" dir="auto">
                  {isHe ? "נרשמת! נחזור אליך בהקדם." : "You're in! We'll be in touch soon."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-2">
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
                    : (isHe ? "הצטרף" : "Join")}
                </Button>
              </form>
            )}
            {error && <p className="text-sm text-destructive" dir="auto">{error}</p>}

          </CardContent>
        </Card>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground space-y-2">
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">
              {tx({ he: "פרטיות", en: "Privacy" }, language)}
            </button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">
              {tx({ he: "תנאי שימוש", en: "Terms" }, language)}
            </button>
            <button onClick={() => navigate("/support")} className="hover:text-foreground transition-colors">
              {tx({ he: "תמיכה", en: "Support" }, language)}
            </button>
          </div>
          <p dir="auto">© 2026 FunnelForge · {isHe ? "עשוי בישראל" : "Made in Israel"}</p>
        </div>
      </footer>
    </main>
  );
}
