import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { getUTM, track } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/i18n/tx";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSeo } from "@/hooks/useSeo";
import {
  Sparkles, ArrowDown, Check, ChevronLeft,
  BarChart3, Crosshair, TrendingUp, DollarSign, Heart,
  Users, Zap, Target, X, ShieldCheck, HelpCircle, Clock, Quote,
} from "lucide-react";

// Real: LinkedIn community followers (stated by founder)
const LINKEDIN_COMMUNITY = 4400;

// Real testimonials only. Add entries here as they arrive from real users.
// Leave empty until then: we do not ship placeholder quotes (board ruling).
const TESTIMONIALS: {
  quote: { he: string; en: string };
  name: string;
  role: { he: string; en: string };
}[] = [];

export default function PublicLanding() {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  useSeo({
    title: isHe
      ? "FunnelForge - שיווק, מכירות ותמחור לעסקים קטנים"
      : "FunnelForge - marketing, sales and pricing for small businesses",
    description: isHe
      ? "בנה תוכנית שיווק, מכירות ותמחור מותאמת לעסק שלך תוך 5 דקות, מבוסס דאטה ומדע התנהגותי."
      : "Build a marketing, sales and pricing plan tailored to your business in 5 minutes, grounded in data and behavioral science.",
  });

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSticky, setShowSticky] = useState(false);

  const mp = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

  // Measurement benchmark: the landing must report its own funnel.
  // Denominator for every downstream conversion metric on this page.
  useEffect(() => {
    void track("aarrr.acquisition.landing_view", { variant: "home" }, { uiOnly: true });
  }, []);

  // Fogg prompt: keep the primary action reachable once the user scrolls
  // past the hero, so motivation never outruns availability.
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  // Single CTA spine: every primary button funnels to the same action and
  // reports which surface drove the click.
  const goToWizard = (cta: string) => {
    void track("aarrr.acquisition.signup_started", { cta }, { uiOnly: true });
    navigate("/wizard");
  };

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
      void track("aarrr.acquisition.signup_completed", { variant: "home-waitlist" }, { uiOnly: true });
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

  // Honest qualification (board + Gate 1 anti-signal). Disqualifying the wrong
  // fit builds trust and protects activation quality.
  const forWho = [
    { he: "בעלי עסק קטן ועצמאים שמוכרים ידע, שירות או תהליך", en: "Solo founders and small businesses selling knowledge, a service, or a process" },
    { he: "מי שיודע לעשות את העבודה, אבל מתקשה לנסח, לתמחר או למכור אותה", en: "People who know their craft but struggle to articulate, price, or sell it" },
    { he: "מי שרוצה תוכנית מבוססת דאטה ומדע התנהגותי, לא עוד השראה", en: "Anyone who wants a data and behavioral-science plan, not more inspiration" },
  ];
  const notForWho = [
    { he: "מי שמחפש פתרון קסם בלי להזין שום מידע על העסק", en: "Anyone expecting magic with zero input about their business" },
    { he: "ארגונים גדולים עם מחלקת שיווק שלמה. הכלי בנוי ליחידים ולעסקים קטנים", en: "Large orgs with a full marketing department. This is built for solo and small businesses" },
    { he: "מי שמחפש ליווי רגשי כללי. זה כלי עסקי ממוקד, לא תחליף לייעוץ אישי", en: "Anyone seeking general emotional support. This is a focused business tool, not personal counseling" },
  ];

  // Objection handling (PAS). Each entry neutralizes a top reason not to start.
  const faqs = [
    {
      q: { he: "האם העברית באמת טובה?", en: "Is the Hebrew actually good?" },
      a: { he: "כל פלט נכתב בעברית עסקית ומבוסס על מה שתזין על העסק שלך. אתה עורך ומאשר לפני כל שימוש, תמיד.", en: "Every output is business Hebrew grounded in what you enter. You edit and approve before any use, always." },
    },
    {
      q: { he: "זה מתאים לתחום שלי?", en: "Does it fit my niche?" },
      a: { he: "הכלי מתאים את עצמו לתעשייה, לקהל ולמודל המכירה שלך. הוא בנוי לרוחב של שירותים, ידע ותהליכים.", en: "It adapts to your industry, audience, and sales model. Built across services, knowledge, and process businesses." },
    },
    {
      q: { he: "כמה זמן עד תוצאה ראשונה?", en: "How long to a first result?" },
      a: { he: "התוכנית הראשונה מוכנה תוך כ-5 דקות, משאלות ממוקדות בלי בלבול.", en: "Your first plan is ready in about 5 minutes from focused questions." },
    },
    {
      q: { he: "זה באמת חינם?", en: "Is it really free?" },
      a: { he: "יש תוכנית חינמית ותקופת גישה מוקדמת ללא עלות, בלי כרטיס אשראי.", en: "There is a free plan and a no-cost early-access period, no credit card." },
    },
    {
      q: { he: "אני לא מבין בשיווק, אצליח?", en: "I am not a marketer, will it work for me?" },
      a: { he: "הכלי בנוי בדיוק בשבילך. אתה מקבל סקריפטים מוכנים להעתקה וצעד אחרי צעד.", en: "It is built for exactly that. You get copy-paste scripts and step by step guidance." },
    },
    {
      q: { he: "מה קורה עם המידע שלי?", en: "What about my data?" },
      a: { he: "המידע שלך נשאר שלך. אפשר לראות את כל הפרטים במדיניות הפרטיות.", en: "Your data stays yours. Full details are in the privacy policy." },
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

          {/* Anchor nav: section-as-a-site feel. Hidden on small screens. */}
          <nav className="hidden items-center gap-1 sm:flex">
            <button onClick={() => scrollToId("how")} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {tx({ he: "איך זה עובד", en: "How it works" }, language)}
            </button>
            <button onClick={() => scrollToId("who")} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {tx({ he: "למי זה מתאים", en: "Who it's for" }, language)}
            </button>
            <button onClick={() => scrollToId("faq")} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {tx({ he: "שאלות נפוצות", en: "FAQ" }, language)}
            </button>
          </nav>

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
              onClick={() => goToWizard("hero")}
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
      <section id="how" className="container mx-auto px-4 py-16 scroll-mt-24">
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

      {/* ── Who it's for / not for ── honest qualification builds trust */}
      <section id="who" className="container mx-auto px-4 py-12 scroll-mt-24">
        <motion.h2 {...mp} className="text-2xl font-bold text-center text-foreground mb-10" dir="auto">
          {tx({ he: "למי זה מתאים (ולמי פחות)", en: "Who it's for (and who it isn't)" }, language)}
        </motion.h2>
        <div className="max-w-3xl mx-auto grid gap-4 sm:grid-cols-2">
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-accent" dir="auto">
                <Target className="h-4 w-4" />
                {tx({ he: "מתאים לך אם", en: "It's for you if" }, language)}
              </div>
              <ul className="space-y-2 text-sm text-foreground" dir="auto">
                {forWho.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{isHe ? item.he : item.en}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="border-border bg-muted/30">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground" dir="auto">
                <X className="h-4 w-4" />
                {tx({ he: "כנראה לא בשבילך אם", en: "Probably not for you if" }, language)}
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground" dir="auto">
                {notForWho.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <X className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
                    <span>{isHe ? item.he : item.en}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Before / After ── loss aversion */}
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

      {/* ── Testimonials ── renders only when real quotes exist (no fake proof) */}
      {TESTIMONIALS.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <motion.h2 {...mp} className="text-2xl font-bold text-center text-foreground mb-10" dir="auto">
            {tx({ he: "מה אומרים בעלי עסקים", en: "What business owners say" }, language)}
          </motion.h2>
          <div className="max-w-4xl mx-auto grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Card key={i} className="border-border bg-card">
                <CardContent className="p-5 space-y-3">
                  <Quote className="h-5 w-5 text-primary/60" />
                  <p className="text-sm text-foreground" dir="auto">{isHe ? t.quote.he : t.quote.en}</p>
                  <div className="text-xs text-muted-foreground" dir="auto">
                    <span className="font-semibold text-foreground">{t.name}</span>
                    {" · "}
                    {isHe ? t.role.he : t.role.en}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── FAQ ── objection handling */}
      <section id="faq" className="container mx-auto px-4 py-16 scroll-mt-24">
        <motion.h2 {...mp} className="mb-10 flex items-center justify-center gap-2 text-2xl font-bold text-center text-foreground" dir="auto">
          <HelpCircle className="h-6 w-6 text-primary" />
          {tx({ he: "שאלות נפוצות", en: "Frequently asked" }, language)}
        </motion.h2>
        <div className="max-w-2xl mx-auto space-y-3">
          {faqs.map((f, i) => (
            <motion.div
              key={i}
              {...(reducedMotion
                ? {}
                : { initial: { opacity: 0, y: 12 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { delay: i * 0.05 } })}
            >
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <h3 className="mb-1.5 font-bold text-foreground" dir="auto">{isHe ? f.q.he : f.q.en}</h3>
                  <p className="text-sm text-muted-foreground" dir="auto">{isHe ? f.a.he : f.a.en}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Cost of inaction ── prospect theory framing before the final ask */}
      <section className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
          <Clock className="mx-auto mb-2 h-6 w-6 text-amber-500" />
          <p className="text-base font-medium text-foreground" dir="auto">
            {isHe
              ? "כל חודש בלי מיקוד הוא לקוחות שהלכו למתחרה שפשוט ידע לנסח את עצמו טוב יותר."
              : "Every month without focus is clients going to a competitor who simply said it better."}
          </p>
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
              <>
                {/* Primary action stays the product itself; waitlist is the lower-commitment fallback */}
                <Button
                  size="lg"
                  onClick={() => goToWizard("final")}
                  className="gap-2 w-full sm:w-auto cta-warm"
                >
                  <Zap className="h-5 w-5" />
                  {tx({ he: "בנה את התוכנית שלי - חינם", en: "Build My Plan - Free" }, language)}
                </Button>
                <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  {tx({ he: "או קבל עדכון כשנפתח", en: "or get notified at launch" }, language)}
                  <span className="h-px flex-1 bg-border" />
                </div>
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
                  <Button type="submit" disabled={submitting} variant="outline" className="shrink-0">
                    {submitting
                      ? (isHe ? "שולח..." : "Sending...")
                      : (isHe ? "הצטרף" : "Join")}
                  </Button>
                </form>
              </>
            )}
            {error && <p className="text-sm text-destructive" dir="auto">{error}</p>}

            <p className="flex items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground" dir="auto">
              <ShieldCheck className="h-3.5 w-3.5" />
              {tx({ he: "המידע שלך נשאר שלך. ללא ספאם.", en: "Your data stays yours. No spam." }, language)}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 py-8 pb-24 sm:pb-8">
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

      {/* ── Sticky CTA ── Fogg prompt, appears after the hero scrolls away */}
      {showSticky && !submitted && (
        <motion.div
          {...(reducedMotion ? {} : { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } })}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur sm:hidden"
        >
          <div className="container mx-auto flex items-center gap-3 px-4 py-3">
            <span className="flex-1 text-sm font-medium text-foreground" dir="auto">
              {tx({ he: "תוכנית מותאמת תוך 5 דקות", en: "A tailored plan in 5 minutes" }, language)}
            </span>
            <Button size="sm" onClick={() => goToWizard("sticky")} className="gap-1 cta-warm shrink-0">
              <Zap className="h-4 w-4" />
              {tx({ he: "התחל חינם", en: "Start free" }, language)}
            </Button>
          </div>
        </motion.div>
      )}
    </main>
  );
}
