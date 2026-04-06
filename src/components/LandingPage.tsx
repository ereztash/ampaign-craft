import { useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { FunnelResult, SavedPlan, ExperienceLevel } from "@/types/funnel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, BarChart3, Target, Rocket, Clock, FileText, Hammer, Megaphone, LineChart, Database, Zap, Flame, Crosshair } from "lucide-react";
import { motion } from "framer-motion";
import { getTotalUsers } from "@/lib/socialProofData";
import { generateWeeklyPulse } from "@/engine/pulseEngine";
import { useAchievements } from "@/hooks/useAchievements";
import MarketingWrapped from "@/components/MarketingWrapped";

interface LandingPageProps {
  onStart: () => void;
  onStartWithSegment?: (segment: ExperienceLevel) => void;
  onLoadLastPlan?: (result: FunnelResult) => void;
  onStartDifferentiation?: () => void;
}

const LandingPage = ({ onStart, onStartWithSegment, onLoadLastPlan, onStartDifferentiation }: LandingPageProps) => {
  const { t, language, isRTL } = useLanguage();
  const isHe = language === "he";
  const { profile } = useUserProfile();
  const reducedMotion = useReducedMotion();
  const { streak, mastery } = useAchievements(language);

  const savedPlans = useMemo<SavedPlan[]>(() => {
    try { return JSON.parse(localStorage.getItem("funnelforge-plans") || "[]"); }
    catch { return []; }
  }, [profile.savedPlanCount]);

  const pulse = useMemo(() => generateWeeklyPulse(savedPlans), [savedPlans]);

  const features = [
    { icon: Target, title: t("featureAnalyze"), desc: t("featureAnalyzeDesc") },
    { icon: BarChart3, title: t("featurePlan"), desc: t("featurePlanDesc") },
    { icon: Rocket, title: t("featureExecute"), desc: t("featureExecuteDesc") },
  ];

  const motionProps = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7 } };

  const handleLoadLastPlan = () => {
    if (!onLoadLastPlan) return;
    try {
      const plans: SavedPlan[] = JSON.parse(localStorage.getItem("funnelforge-plans") || "[]");
      if (plans.length > 0) {
        const sorted = [...plans].sort(
          (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        );
        onLoadLastPlan(sorted[0].result);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-4 pt-16">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-accent/5 blur-3xl" />
        </div>

        <motion.div
          {...motionProps}
          className="relative z-10 max-w-3xl text-center"
        >
          {/* Funnel icon */}
          <motion.div
            {...(reducedMotion ? {} : { initial: { scale: 0 }, animate: { scale: 1 }, transition: { delay: 0.2, type: "spring", stiffness: 200 } })}
            className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl funnel-gradient shadow-lg"
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-accent-foreground">
              <path d="M3 4h18l-6 8v6l-6 2V12L3 4z" fill="currentColor" opacity="0.9" />
            </svg>
          </motion.div>

          {/* Returning user greeting */}
          {profile.isReturningUser ? (
            <>
              <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                {language === "he" ? "ברוך שובך!" : "Welcome Back!"}
              </h1>
              <p className="mb-6 text-lg text-muted-foreground sm:text-xl">
                {t("heroSubtitle")}
              </p>

              {/* Last plan summary */}
              {profile.lastPlanSummary && onLoadLastPlan && (
                <Card className="mx-auto mb-8 max-w-md border-primary/20 bg-primary/5">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 text-start">
                      <div className="font-semibold text-foreground">{profile.lastPlanSummary.name}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(profile.lastPlanSummary.date).toLocaleDateString(language === "he" ? "he-IL" : "en-US")}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleLoadLastPlan}>
                      {language === "he" ? "צפה" : "View"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Mini stats + Streak */}
              <div className="mb-4 flex justify-center gap-6 text-sm text-muted-foreground">
                <span>{isHe ? `${profile.savedPlanCount} תוכניות` : `${profile.savedPlanCount} plans`}</span>
                <span>•</span>
                <span>{isHe ? `ביקור #${profile.visitCount}` : `Visit #${profile.visitCount}`}</span>
                {streak.currentStreak > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-accent font-semibold">
                      <Flame className="h-3.5 w-3.5" />
                      {streak.currentStreak} {isHe ? "שבועות רצופים" : "week streak"}
                    </span>
                  </>
                )}
              </div>

              {/* Mastery Progress Bar */}
              {mastery.percentage > 0 && (
                <div className="mx-auto mb-6 max-w-xs">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{isHe ? "שליטה בכלי" : "Tool Mastery"}</span>
                    <span className="font-medium text-foreground">{mastery.percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/30">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                      style={{ width: `${mastery.percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Weekly Pulse Card */}
              {pulse && (
                  <Card className="mx-auto mb-8 max-w-lg border-accent/20 bg-accent/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-4 w-4 text-accent" />
                        <span className="font-semibold text-foreground text-sm">{pulse.greeting[language]}</span>
                      </div>
                      <div className="space-y-2">
                        {pulse.actions.map((a, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span>{a.emoji}</span>
                            <div>
                              <span className="text-foreground">{a.action[language]}</span>
                              <span className="text-muted-foreground ml-1">({a.impact[language]})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-[11px] text-muted-foreground italic">{pulse.insightOfTheWeek[language]}</p>
                      {/* Loss-framed retention messages */}
                      {pulse.lossFramedMessages.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-accent/10">
                          <p className="text-[11px] text-muted-foreground">
                            {pulse.lossFramedMessages[0].emoji} {pulse.lossFramedMessages[0].message[language]}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
              )}

              {/* Marketing Wrapped */}
              {savedPlans.length >= 2 ? (
                <div className="mx-auto mb-8 max-w-lg">
                  <MarketingWrapped plans={savedPlans} />
                </div>
              ) : savedPlans.length === 1 ? (
                <div className="mx-auto mb-8 max-w-lg rounded-xl border border-accent/20 bg-accent/5 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {isHe
                      ? "🎁 שמור עוד תוכנית אחת כדי לפתוח את Marketing Wrapped שלך"
                      : "🎁 Save one more plan to unlock your Marketing Wrapped"}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  size="lg"
                  onClick={onStart}
                  className="h-14 px-10 text-lg font-semibold funnel-gradient border-0 text-accent-foreground hover:opacity-90 transition-opacity"
                >
                  {language === "he" ? "תוכנית חדשה" : "New Plan"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                {t("heroTitle")}
              </h1>
              <p className="mb-6 text-lg text-muted-foreground sm:text-xl">
                {t("heroSubtitle")}
              </p>
              <p className="mb-8 text-sm text-muted-foreground">
                {isHe
                  ? `${getTotalUsers().toLocaleString()}+ עסקים ישראליים כבר משתמשים`
                  : `${getTotalUsers().toLocaleString()}+ Israeli businesses already using it`}
              </p>
              <Button
                size="lg"
                onClick={onStart}
                className="h-14 px-10 text-lg font-semibold funnel-gradient border-0 text-accent-foreground hover:opacity-90 transition-opacity"
              >
                {t("ctaButton")}
              </Button>
            </>
          )}
        </motion.div>

        {!reducedMotion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-8"
          >
            <ArrowDown className="h-6 w-6 animate-bounce text-muted-foreground" />
          </motion.div>
        )}
      </section>

      {/* ═══ Single CTA — no decision forks (Reference: Notion onboarding) ═══ */}
      <section className="container mx-auto px-4 pb-12 text-center">
        <Button size="lg" onClick={onStart} className="gap-2 text-lg px-10 py-6 rounded-xl cta-warm shadow-lg">
          <Sparkles className="h-5 w-5" />
          {isHe ? "בנה את התוכנית שלי — בחינם" : "Build My Plan — Free"}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          {isHe ? "ללא כרטיס אשראי · 2 דקות · שאלון הבידול זמין בפנים" : "No credit card · 2 min · Differentiation available inside"}
        </p>
      </section>

      {/* Removed: Dual Path, Segment Picker, Data Intelligence — too many choices */}
      {/* Experience level is now asked as first wizard question */}

      {/* Features */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              {...(reducedMotion ? {} : {
                initial: { opacity: 0, y: 20 },
                whileInView: { opacity: 1, y: 0 },
                viewport: { once: true },
                transition: { delay: i * 0.15 },
              })}
              className="glass-card rounded-2xl p-8 text-center transition-shadow hover:shadow-lg"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
