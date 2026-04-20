
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getTotalUsers } from "@/lib/socialProofData";
import { TIERS } from "@/lib/pricingTiers";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/i18n/tx";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Crosshair, BarChart3, TrendingUp, DollarSign, Heart, Sparkles, ArrowDown, Check } from "lucide-react";

const PageComponent = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { user } = useAuth();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const totalUsers = getTotalUsers();

  // Authenticated users go to dashboard
  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const mp = reducedMotion ? {} : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

  const modules = [
    { icon: Crosshair, color: "text-amber-500", title: tx({ he: "בידול", en: "Differentiation" }, language), desc: tx({ he: "גלה מה באמת מבדל אותך. לא תיאורים, מנגנונים", en: "Discover what truly differentiates you. Mechanisms, not adjectives" }, language) },
    { icon: BarChart3, color: "text-primary", title: tx({ he: "שיווק", en: "Marketing" }, language), desc: tx({ he: "משפך 5 שלבים + ערוצים + תקציב + hooks מותאמים", en: "5-stage funnel + channels + budget + personalized hooks" }, language) },
    { icon: TrendingUp, color: "text-accent", title: tx({ he: "מכירות", en: "Sales" }, language), desc: tx({ he: "סקריפטים, התנגדויות, neuro-closing. מוכנים להעתקה", en: "Scripts, objections, neuro-closing. Ready to copy" }, language) },
    { icon: DollarSign, color: "text-emerald-500", title: tx({ he: "תמחור", en: "Pricing" }, language), desc: tx({ he: "מבנה tiers, offer stack, אחריות, מסגור מחיר", en: "Tier structure, offer stack, guarantee, price framing" }, language) },
    { icon: Heart, color: "text-pink-500", title: tx({ he: "שימור", en: "Retention" }, language), desc: tx({ he: "Onboarding, churn prevention, referral, loyalty", en: "Onboarding, churn prevention, referral, loyalty" }, language) },
  ];

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero — Neuro-Storytelling Arc: Cortisol → Oxytocin → Dopamine */}
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 pt-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <motion.div {...mp} className="relative z-10 max-w-3xl text-center">
          <motion.div
            {...(reducedMotion ? {} : { initial: { scale: 0 }, animate: { scale: 1 }, transition: { type: "spring", stiffness: 200 } })}
            className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl funnel-gradient shadow-lg"
          >
            <Sparkles className="h-10 w-10 text-accent-foreground" />
          </motion.div>

          {/* Cortisol — pain/scroll-stop */}
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl" dir="auto">
            {tx({ he: "משקיע בשיווק ולא רואה תוצאות?", en: "Investing in marketing with no results?" }, language)}
          </h1>

          {/* Oxytocin — trust/empathy */}
          <p className="mb-6 text-lg text-muted-foreground sm:text-xl max-w-xl mx-auto" dir="auto">
            {isHe
              ? `אנחנו מבינים. ${totalUsers.toLocaleString()}+ בעלי עסקים ישראליים הרגישו בדיוק ככה, ובנו תוכנית שעובדת.`
              : `We get it. ${totalUsers.toLocaleString()}+ Israeli business owners felt exactly the same, and built a plan that works.`}
          </p>

          {/* Dopamine — CTA (single, warm orange) */}
          <div className="flex flex-col items-center gap-2">
            <Button size="lg" onClick={() => navigate("/wizard")} className="gap-2 text-lg px-10 py-6 rounded-xl cta-warm shadow-lg">
              <Sparkles className="h-5 w-5" />
              {tx({ he: "בנה את התוכנית שלי - חינם", en: "Build My Plan - Free" }, language)}
            </Button>
            <p className="text-xs text-muted-foreground" dir="auto">
              {isHe
                ? `ללא כרטיס אשראי · 2 דקות · ${totalUsers.toLocaleString()}+ עסקים כבר בפנים`
                : `No credit card · 2 minutes · ${totalUsers.toLocaleString()}+ businesses already in`}
            </p>
          </div>

          <motion.div {...(reducedMotion ? {} : { animate: { y: [0, 8, 0] }, transition: { repeat: Infinity, duration: 2 } })} className="mt-12">
            <ArrowDown className="h-6 w-6 text-muted-foreground mx-auto" />
          </motion.div>
        </motion.div>
      </section>

      {/* 5 Modules */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-10" dir="auto">
          {tx({ he: "5 מודולים. מחזור שלם.", en: "5 Modules. Complete Cycle." }, language)}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {modules.map((mod, i) => (
            <motion.div key={i} {...(reducedMotion ? {} : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { delay: i * 0.1 } })}>
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-5 text-center">
                  <mod.icon className={`h-8 w-8 mx-auto mb-3 ${mod.color}`} />
                  <h3 className="font-bold text-foreground mb-1">{mod.title}</h3>
                  <p className="text-xs text-muted-foreground" dir="auto">{mod.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        {/* Pipeline arrow */}
        <div className="flex justify-center mt-6 gap-1 text-muted-foreground text-xs">
          {modules.map((m, i) => (
            <span key={i} className="flex items-center gap-1">
              {m.title}
              {i < modules.length - 1 && <span>→</span>}
            </span>
          ))}
        </div>
      </section>

      {/* Early Adopter CTA */}
      <section className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto border-primary/20 bg-primary/5">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-lg font-bold text-foreground" dir="auto">
              {isHe
                ? "הצטרפו ל-Early Adopters שלנו וקבלו גישה מלאה בחינם לחודשיים"
                : "Join our Early Adopters and get full access free for 2 months"}
            </p>
            <Button onClick={() => navigate("/wizard")} className="gap-2 cta-warm">
              {tx({ he: "התחל עכשיו בחינם", en: "Start Free Now" }, language)}
            </Button>
            <div className="flex flex-wrap justify-center gap-4 pt-4 text-xs text-muted-foreground">
              <span>21 {tx({ he: "מנועי אינטליגנציה", en: "intelligence engines" }, language)}</span>
              <span>31 {tx({ he: "דומיינים מוטמעים", en: "embedded domains" }, language)}</span>
              <span>40 {tx({ he: "שדות ידע ישראלי", en: "Israeli knowledge fields" }, language)}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Before/After — Neuro Vectors: Cortisol → Bridge → Dopamine */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto grid gap-4 sm:grid-cols-2">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-5">
              <div className="text-sm font-bold text-destructive mb-2" dir="auto">🔴 {tx({ he: "לפני", en: "Before" }, language)}</div>
              <ul className="space-y-2 text-sm text-muted-foreground" dir="auto">
                <li>{tx({ he: "מבזבז שעות על פוסטים שאף אחד לא רואה", en: "Wasting hours on posts nobody sees" }, language)}</li>
                <li>{tx({ he: "לא יודע כמה לגבות", en: "Don't know how much to charge" }, language)}</li>
                <li>{tx({ he: "מאבד לקוחות למתחרים", en: "Losing customers to competitors" }, language)}</li>
                <li>{tx({ he: "לא יודע מה עושים קודם", en: "Don't know what to do first" }, language)}</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="p-5">
              <div className="text-sm font-bold text-accent mb-2" dir="auto">🟢 {tx({ he: "אחרי", en: "After" }, language)}</div>
              <ul className="space-y-2 text-sm text-foreground" dir="auto">
                <li>{tx({ he: "תוכנית שיווק מותאמת לתעשייה שלך", en: "Marketing plan tailored to your industry" }, language)}</li>
                <li>{tx({ he: "סקריפטי מכירה מוכנים להעתקה", en: "Copy-paste sales scripts" }, language)}</li>
                <li>{tx({ he: "תמחור מבוסס על דאטה ישראלי", en: "Pricing based on Israeli market data" }, language)}</li>
                <li>{tx({ he: "לקוחות שחוזרים, עם תוכנית שימור", en: "Returning customers, with retention plan" }, language)}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16 bg-muted/30">
        <h2 className="text-2xl font-bold text-center text-foreground mb-10" dir="auto">
          {tx({ he: "איך זה עובד?", en: "How It Works" }, language)}
        </h2>
        <div className="grid gap-8 sm:grid-cols-3 max-w-3xl mx-auto">
          {[
            { step: "1", title: tx({ he: "ענה על שאלות", en: "Answer Questions" }, language), desc: tx({ he: "2-12 דקות. המערכת לומדת את העסק שלך", en: "2-12 minutes. The system learns your business" }, language) },
            { step: "2", title: tx({ he: "קבל אסטרטגיה", en: "Get Your Strategy" }, language), desc: tx({ he: "תוכנית מותאמת אישית עם סקריפטים מוכנים", en: "Personalized plan with ready-to-use scripts" }, language) },
            { step: "3", title: tx({ he: "בצע ותצמח", en: "Execute & Grow" }, language), desc: tx({ he: "העתק, הדבק, ותצא לדרך", en: "Copy, paste, and go" }, language) },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">{s.step}</div>
              <h3 className="font-bold text-foreground mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground" dir="auto">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-foreground mb-10" dir="auto">
          {tx({ he: "תוכניות", en: "Plans" }, language)}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
          {TIERS.map((tier, i) => (
            <Card key={tier.id} className={`${i === 1 ? "border-primary border-2 relative" : ""}`}>
              {i === 1 && <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs">{tx({ he: "הכי פופולרי", en: "Most Popular" }, language)}</Badge>}
              <CardContent className="p-5 text-center">
                <h3 className="font-bold text-lg">{tier.name[language]}</h3>
                <div className="text-2xl font-bold text-primary my-2">{tier.price[language]}</div>
                <div className="space-y-1 text-xs text-muted-foreground text-start">
                  {tier.features.slice(0, 4).map((f, j) => (
                    <div key={j} className="flex items-start gap-1.5">
                      <Check className="h-3 w-3 text-accent mt-0.5 shrink-0" />
                      <span>{f[language]}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4" dir="auto">
          {tx({ he: "מוכן להתחיל?", en: "Ready to Start?" }, language)}
        </h2>
        <Button size="lg" onClick={() => navigate("/wizard")} className="gap-2 text-lg px-10 py-6 rounded-xl cta-warm shadow-lg">
          <Sparkles className="h-5 w-5" />
          {tx({ he: "בנה את התוכנית שלי - חינם", en: "Build My Plan - Free" }, language)}
        </Button>
      </section>
    </main>
  );
}

export default PageComponent;
