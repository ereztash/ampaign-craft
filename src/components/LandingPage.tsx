import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { FunnelResult, SavedPlan, ExperienceLevel } from "@/types/funnel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, BarChart3, Target, Rocket, Clock, FileText, Hammer, Megaphone, LineChart, Database, Zap, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { getTotalUsers } from "@/lib/socialProofData";
import { generateWeeklyPulse } from "@/engine/pulseEngine";
import { useAchievements } from "@/hooks/useAchievements";

interface LandingPageProps {
  onStart: () => void;
  onStartWithSegment?: (segment: ExperienceLevel) => void;
  onLoadLastPlan?: (result: FunnelResult) => void;
}

const LandingPage = ({ onStart, onStartWithSegment, onLoadLastPlan }: LandingPageProps) => {
  const { t, language, isRTL } = useLanguage();
  const isHe = language === "he";
  const { profile } = useUserProfile();
  const reducedMotion = useReducedMotion();
  const { streak, mastery } = useAchievements(language);

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
              {(() => {
                const plans: SavedPlan[] = (() => { try { return JSON.parse(localStorage.getItem("funnelforge-plans") || "[]"); } catch { return []; } })();
                const pulse = generateWeeklyPulse(plans);
                if (!pulse) return null;
                return (
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
                );
              })()}

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

      {/* Segment Picker — MECE: Builder / Amplifier / Analyst */}
      <section className="container mx-auto px-4 pb-12">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            {isHe ? "איפה אתה בדרך?" : "Where are you on the journey?"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {isHe ? "בחר את הנתיב שמתאים לך — נתאים את החוויה" : "Choose your path — we'll tailor the experience"}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              segment: "beginner" as ExperienceLevel,
              icon: Hammer,
              emoji: "🏗️",
              title: { he: "אני מתחיל", en: "I'm Starting" },
              desc: { he: "בנה את תוכנית השיווק הראשונה שלך — פשוט, ברור, ללא ז'רגון", en: "Build your first marketing plan — simple, clear, no jargon" },
              color: "border-primary/30 hover:border-primary bg-primary/5",
            },
            {
              segment: "intermediate" as ExperienceLevel,
              icon: Megaphone,
              emoji: "📢",
              title: { he: "אני מגדיל", en: "I'm Growing" },
              desc: { he: "הגבר את המותג האישי שלך עם מסגרות מיצוב, נוירו-סטוריטלינג וקופי", en: "Amplify your personal brand with positioning frameworks, neuro-storytelling & copy" },
              color: "border-accent/30 hover:border-accent bg-accent/5",
            },
            {
              segment: "advanced" as ExperienceLevel,
              icon: LineChart,
              emoji: "📊",
              title: { he: "אני ממטב", en: "I'm Optimizing" },
              desc: { he: "נתונים, מדע התנהגותי ומוניטור ביצועים לשיווק מבוסס אינסייטס", en: "Data, behavioral science & performance monitoring for insight-driven marketing" },
              color: "border-destructive/30 hover:border-destructive bg-destructive/5",
            },
          ].map((seg, i) => (
            <motion.div
              key={seg.segment}
              {...(reducedMotion ? {} : {
                initial: { opacity: 0, y: 20 },
                whileInView: { opacity: 1, y: 0 },
                viewport: { once: true },
                transition: { delay: i * 0.15 },
              })}
            >
              <button
                onClick={() => onStartWithSegment ? onStartWithSegment(seg.segment) : onStart()}
                className={`w-full glass-card rounded-2xl p-8 text-center transition-all hover:shadow-lg border-2 ${seg.color}`}
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-card">
                  <seg.icon className="h-7 w-7 text-foreground" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-foreground">{seg.title[language]}</h3>
                <p className="text-sm text-muted-foreground">{seg.desc[language]}</p>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Data Intelligence Entry Point */}
        <motion.div
          {...(reducedMotion ? {} : {
            initial: { opacity: 0, y: 20 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true },
            transition: { delay: 0.45 },
          })}
          className="mt-6"
        >
          <button
            onClick={() => onStartWithSegment ? onStartWithSegment("advanced") : onStart()}
            className="w-full glass-card rounded-2xl p-6 text-center transition-all hover:shadow-lg border-2 border-primary/20 hover:border-primary/40 bg-gradient-to-r from-primary/5 to-accent/5"
          >
            <div className="flex items-center justify-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div className="text-start">
                <h3 className="text-lg font-bold text-foreground">
                  {isHe ? "יש לי נתונים לנתח" : "I have data to analyze"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isHe ? "ייבא XLSX, נתח מגמות, וקבל תובנות מבוססות היקשי עבר" : "Import XLSX, analyze trends, and get insights based on historical data"}
                </p>
              </div>
            </div>
          </button>
        </motion.div>
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
