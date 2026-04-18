
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { buildDefaultKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { getRecommendedNextStep } from "@/engine/nextStepEngine";
import { useAchievements } from "@/hooks/useAchievements";
import { getTotalUsers } from "@/lib/socialProofData";
import { safeStorage } from "@/lib/safeStorage";
import Header from "@/components/Header";
import ModulePipeline from "@/components/ModulePipeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/i18n/tx";
import { Sparkles, ArrowDown, Flame, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const PageComponent = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const totalUsers = getTotalUsers();
  const { streak, masteryFeatures } = useAchievements(language);

  const mp = reducedMotion ? {} : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } };

  // Build personalized greeting for authenticated users
  const graph = useMemo(() => {
    if (profile.lastFormData) return buildDefaultKnowledgeGraph();
    return null;
  }, [profile.lastFormData]);

  const hasDiff = !!safeStorage.getString("funnelforge-differentiation-result", "");
  const planCount = safeStorage.getJSON<unknown[]>("funnelforge-plans", []).length;

  const nextStep = useMemo(() => {
    const fallbackGraph = graph || buildDefaultKnowledgeGraph();
    return getRecommendedNextStep(fallbackGraph, hasDiff, planCount, masteryFeatures);
  }, [graph, hasDiff, planCount, masteryFeatures]);

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero — adapts to auth state */}
      <section className="relative flex min-h-[40vh] sm:min-h-[60vh] flex-col items-center justify-center overflow-hidden px-4 pt-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/4 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <motion.div {...mp} className="relative z-10 max-w-3xl text-center">
          {user && graph ? (
            <>
              {/* Authenticated: personalized greeting */}
              <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl" dir="auto">
                {graph.derived.identityStatement[language]}
              </h1>
              <p className="mb-4 text-sm text-muted-foreground" dir="auto">
                {tx({ he: "בחר מודול להתחיל או להמשיך:", en: "Choose a module to start or continue:" }, language)}
              </p>
              {streak.currentStreak > 0 && (
                <Badge className="mb-4 gap-1"><Flame className="h-3 w-3" /> {streak.currentStreak} {tx({ he: "שבועות", en: "weeks" }, language)}</Badge>
              )}
            </>
          ) : (
            <>
              {/* New user: neuro-storytelling headline */}
              <h1 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl md:text-5xl" dir="auto">
                {tx({ he: "משקיע בשיווק ולא רואה תוצאות?", en: "Investing in marketing with no results?" }, language)}
              </h1>
              <p className="mb-6 text-lg text-muted-foreground max-w-xl mx-auto" dir="auto">
                {isHe
                  ? `5 מודולים שעובדים ביחד: בידול → שיווק → מכירות → תמחור → שימור. ${totalUsers.toLocaleString()}+ בעלי עסקים ישראליים כבר בפנים.`
                  : `5 modules working together: Differentiation → Marketing → Sales → Pricing → Retention. ${totalUsers.toLocaleString()}+ Israeli business owners already in.`}
              </p>
            </>
          )}
        </motion.div>

        <motion.div {...(reducedMotion ? {} : { animate: { y: [0, 6, 0] }, transition: { repeat: Infinity, duration: 2 } })} className="mt-6">
          <ArrowDown className="h-5 w-5 text-muted-foreground mx-auto" />
        </motion.div>
      </section>

      {/* Module Pipeline — THE core of the page */}
      <section className="container mx-auto px-4 py-8 max-w-4xl">
        <h2 className="text-xl font-bold text-center text-foreground mb-6" dir="auto">
          {tx({ he: "בחר מאיפה להתחיל", en: "Choose Where to Start" }, language)}
        </h2>
        <ModulePipeline showLabels />
      </section>

      {/* Recommended Next Step (for authenticated users) */}
      {user && (
        <section className="container mx-auto px-4 py-4 max-w-2xl">
          <Card role="button" tabIndex={0} className="border-2 border-amber-500/30 bg-amber-500/5 cursor-pointer hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary" onClick={() => navigate("/" + nextStep.route.replace(/^\//, ""))} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/" + nextStep.route.replace(/^\//, "")); }}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground" dir="auto">{nextStep.title[language]}</h3>
                  <Badge className="text-xs bg-amber-500 text-white">{tx({ he: "מומלץ", en: "Recommended" }, language)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground" dir="auto">{nextStep.description[language]}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 rtl:rotate-180" aria-hidden="true" />
            </CardContent>
          </Card>
        </section>
      )}

      {/* Quick links */}
      <section className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <div className="flex flex-wrap justify-center gap-3">
          {planCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => navigate("/plans")}>
              {tx({ he: `תוכניות שמורות (${planCount})`, en: `Saved Plans (${planCount})` }, language)}
            </Button>
          )}
          {user && (
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              {tx({ he: "דשבורד", en: "Dashboard" }, language)}
            </Button>
          )}
          {!user && (
            <p className="text-xs text-muted-foreground w-full mt-2">
              {tx({ he: "ללא כרטיס אשראי · חינם לגמרי · 2 דקות להתחלה", en: "No credit card · Completely free · 2 minutes to start" }, language)}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

export default PageComponent;
