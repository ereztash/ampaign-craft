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
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Crosshair, BarChart3, TrendingUp, DollarSign, Heart, Sparkles, ArrowDown, Check } from "lucide-react";

const Landing = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { user } = useAuth();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const totalUsers = getTotalUsers();

  // Authenticated users go to dashboard
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const mp = reducedMotion ? {} : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

  const modules = [
    { icon: Crosshair, color: "text-amber-500", title: isHe ? "בידול" : "Differentiation", desc: isHe ? "גלה מה באמת מבדל אותך — לא תיאורים, מנגנונים" : "Discover what truly differentiates you — mechanisms, not adjectives" },
    { icon: BarChart3, color: "text-primary", title: isHe ? "שיווק" : "Marketing", desc: isHe ? "משפך 5 שלבים + ערוצים + תקציב + hooks מותאמים" : "5-stage funnel + channels + budget + personalized hooks" },
    { icon: TrendingUp, color: "text-accent", title: isHe ? "מכירות" : "Sales", desc: isHe ? "סקריפטים, התנגדויות, neuro-closing — מוכנים להעתקה" : "Scripts, objections, neuro-closing — ready to copy" },
    { icon: DollarSign, color: "text-emerald-500", title: isHe ? "תמחור" : "Pricing", desc: isHe ? "מבנה tiers, offer stack, אחריות, מסגור מחיר" : "Tier structure, offer stack, guarantee, price framing" },
    { icon: Heart, color: "text-pink-500", title: isHe ? "שימור" : "Retention", desc: isHe ? "Onboarding, churn prevention, referral, loyalty" : "Onboarding, churn prevention, referral, loyalty" },
  ];

  return (
    <div className="min-h-screen bg-background">
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
            {isHe ? "משקיע בשיווק ולא רואה תוצאות?" : "Investing in marketing with no results?"}
          </h1>

          {/* Oxytocin — trust/empathy */}
          <p className="mb-6 text-lg text-muted-foreground sm:text-xl max-w-xl mx-auto" dir="auto">
            {isHe
              ? `אנחנו מבינים. ${totalUsers.toLocaleString()}+ בעלי עסקים ישראליים הרגישו בדיוק ככה — ובנו תוכנית שעובדת.`
              : `We get it. ${totalUsers.toLocaleString()}+ Israeli business owners felt exactly the same — and built a plan that works.`}
          </p>

          {/* Dopamine — CTA (single, warm orange) */}
          <div className="flex flex-col items-center gap-2">
            <Button size="lg" onClick={() => navigate("/wizard")} className="gap-2 text-lg px-10 py-6 rounded-xl cta-warm shadow-lg">
              <Sparkles className="h-5 w-5" />
              {isHe ? "בנה את התוכנית שלי — בחינם" : "Build My Plan — Free"}
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
          {isHe ? "5 מודולים. מחזור שלם." : "5 Modules. Complete Cycle."}
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

      {/* Authentic Social Proof — "כאן היה אמור להיות testimonial" */}
      <section className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto border-dashed border-2 border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-3xl">🚧</div>
            <p className="text-lg font-bold text-foreground" dir="auto">
              {isHe
                ? "כאן היה אמור להיות testimonial מרגש עם 47% שיפור בלידים."
                : "Here was supposed to be a testimonial with 47% lead improvement."}
            </p>
            <p className="text-sm text-muted-foreground" dir="auto">
              {isHe
                ? "אבל אנחנו חדשים. עוד אין. בואו תהיו הראשונים שמשאירים ביקורת — ובתמורה תקבלו את המערכת בחינם לחודשיים."
                : "But we're new. None yet. Be the first to leave a review — and get the system free for 2 months."}
            </p>
            <Button onClick={() => navigate("/wizard")} className="gap-2 cta-warm">
              {isHe ? "הצטרף כ-Early Adopter →" : "Join as Early Adopter →"}
            </Button>
            <div className="flex flex-wrap justify-center gap-4 pt-4 text-xs text-muted-foreground">
              <span>🧠 21 {isHe ? "מנועי אינטליגנציה" : "intelligence engines"}</span>
              <span>🌍 31 {isHe ? "דומיינים מוטמעים" : "embedded domains"}</span>
              <span>🇮🇱 40 {isHe ? "שדות ידע ישראלי" : "Israeli knowledge fields"}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Before/After — Neuro Vectors: Cortisol → Bridge → Dopamine */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto grid gap-4 sm:grid-cols-2">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-5">
              <div className="text-sm font-bold text-destructive mb-2" dir="auto">🔴 {isHe ? "לפני" : "Before"}</div>
              <ul className="space-y-2 text-sm text-muted-foreground" dir="auto">
                <li>{isHe ? "מבזבז שעות על פוסטים שאף אחד לא רואה" : "Wasting hours on posts nobody sees"}</li>
                <li>{isHe ? "לא יודע כמה לגבות" : "Don't know how much to charge"}</li>
                <li>{isHe ? "מאבד לקוחות למתחרים" : "Losing customers to competitors"}</li>
                <li>{isHe ? "לא יודע מה עושים קודם" : "Don't know what to do first"}</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="p-5">
              <div className="text-sm font-bold text-accent mb-2" dir="auto">🟢 {isHe ? "אחרי" : "After"}</div>
              <ul className="space-y-2 text-sm text-foreground" dir="auto">
                <li>{isHe ? "תוכנית שיווק מותאמת לתעשייה שלך" : "Marketing plan tailored to your industry"}</li>
                <li>{isHe ? "סקריפטי מכירה מוכנים להעתקה" : "Copy-paste sales scripts"}</li>
                <li>{isHe ? "תמחור מבוסס על דאטה ישראלי" : "Pricing based on Israeli market data"}</li>
                <li>{isHe ? "לקוחות שחוזרים — עם תוכנית שימור" : "Returning customers — with retention plan"}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16 bg-muted/30">
        <h2 className="text-2xl font-bold text-center text-foreground mb-10" dir="auto">
          {isHe ? "איך זה עובד?" : "How It Works"}
        </h2>
        <div className="grid gap-8 sm:grid-cols-3 max-w-3xl mx-auto">
          {[
            { step: "1", title: isHe ? "ענה על שאלות" : "Answer Questions", desc: isHe ? "2-12 דקות. המערכת לומדת את העסק שלך" : "2-12 minutes. The system learns your business" },
            { step: "2", title: isHe ? "קבל אסטרטגיה" : "Get Your Strategy", desc: isHe ? "תוכנית מותאמת אישית עם סקריפטים מוכנים" : "Personalized plan with ready-to-use scripts" },
            { step: "3", title: isHe ? "בצע ותצמח" : "Execute & Grow", desc: isHe ? "העתק, הדבק, ותצא לדרך" : "Copy, paste, and go" },
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
          {isHe ? "תוכניות" : "Plans"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
          {TIERS.map((tier, i) => (
            <Card key={tier.id} className={`${i === 1 ? "border-primary border-2 relative" : ""}`}>
              {i === 1 && <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs">{isHe ? "הכי פופולרי" : "Most Popular"}</Badge>}
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
          {isHe ? "מוכן להתחיל?" : "Ready to Start?"}
        </h2>
        <Button size="lg" onClick={() => navigate("/wizard")} className="gap-2 text-lg px-10 py-6 rounded-xl cta-warm shadow-lg">
          <Sparkles className="h-5 w-5" />
          {isHe ? "בנה את התוכנית שלי — בחינם" : "Build My Plan — Free"}
        </Button>
      </section>
    </div>
  );
};

export default Landing;
