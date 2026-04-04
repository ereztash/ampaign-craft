import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { FunnelResult, SavedPlan } from "@/types/funnel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, BarChart3, Target, Rocket, Clock, FileText } from "lucide-react";
import { motion } from "framer-motion";

interface LandingPageProps {
  onStart: () => void;
  onLoadLastPlan?: (result: FunnelResult) => void;
}

const LandingPage = ({ onStart, onLoadLastPlan }: LandingPageProps) => {
  const { t, language, isRTL } = useLanguage();
  const { profile } = useUserProfile();
  const reducedMotion = useReducedMotion();

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
              <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
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

              {/* Mini stats */}
              <div className="mb-8 flex justify-center gap-6 text-sm text-muted-foreground">
                <span>{language === "he" ? `${profile.savedPlanCount} תוכניות` : `${profile.savedPlanCount} plans`}</span>
                <span>•</span>
                <span>{language === "he" ? `ביקור #${profile.visitCount}` : `Visit #${profile.visitCount}`}</span>
              </div>

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
              <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                {t("heroTitle")}
              </h1>
              <p className="mb-10 text-lg text-muted-foreground sm:text-xl">
                {t("heroSubtitle")}
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
