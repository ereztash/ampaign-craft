import { useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useDataSources } from "@/contexts/DataSourceContext";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { calculateHealthScore } from "@/engine/healthScoreEngine";
import { generateWeeklyPulse } from "@/engine/pulseEngine";
import { detectBottlenecks } from "@/engine/bottleneckEngine";
import { useAchievements } from "@/hooks/useAchievements";
import { useModuleStatus } from "@/hooks/useModuleStatus";
import { getTotalUsers } from "@/lib/socialProofData";
import BusinessPulseBar from "@/components/BusinessPulseBar";
import InsightFeed from "@/components/InsightFeed";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SavedPlan } from "@/types/funnel";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Database, Wand2, Compass, Map } from "lucide-react";

const CommandCenter = () => {
  const { language, t } = useLanguage();
  const isHe = language === "he";
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { sources, refreshFromProfile } = useDataSources();
  const navigate = useNavigate();
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const totalUsers = getTotalUsers();
  const { streak, mastery } = useAchievements(language);
  const modules = useModuleStatus();

  useEffect(() => {
    refreshFromProfile(!!profile.lastFormData);
  }, [profile.lastFormData, refreshFromProfile]);

  const plans = useMemo((): SavedPlan[] => {
    try {
      return JSON.parse(localStorage.getItem("funnelforge-plans") || "[]");
    } catch {
      return [];
    }
  }, [profile.savedPlanCount, profile.lastPlanSummary, location.key]);

  const latestPlan = useMemo(() => {
    if (plans.length === 0) return null;
    return [...plans].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0];
  }, [plans]);

  const graph = useMemo(() => {
    if (profile.lastFormData) return buildUserKnowledgeGraph(profile.lastFormData);
    return buildUserKnowledgeGraph({
      businessField: "",
      audienceType: "b2c",
      ageRange: [25, 55],
      interests: "",
      productDescription: "",
      averagePrice: 0,
      salesModel: "oneTime",
      budgetRange: "medium",
      mainGoal: "sales",
      existingChannels: [],
      experienceLevel: "beginner",
    });
  }, [profile.lastFormData]);

  const hasDiff = !!localStorage.getItem("funnelforge-differentiation-result");
  const healthTotal = latestPlan ? calculateHealthScore(latestPlan.result).total : null;
  const pulse = generateWeeklyPulse(plans);
  const connectedCount = sources.filter((s) => s.status === "connected").length;

  const bottlenecks = detectBottlenecks({
    funnelResult: latestPlan?.result ?? null,
    hasDifferentiation: hasDiff,
    planCount: plans.length,
    connectedSources: connectedCount,
    healthScoreTotal: healthTotal,
  });

  const completedModules = modules.filter((m) => m.completed).length;

  const mp = reducedMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-6 space-y-8">
        <motion.section {...mp} className="text-center space-y-2">
          {user && profile.lastFormData ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground" dir="auto">
                {graph.derived.identityStatement[language]}
              </h1>
              <p className="text-sm text-muted-foreground" dir="auto">
                {isHe ? "סקירת עסק ותובנות בזמן אמת" : "Live business snapshot and intelligence"}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground md:text-4xl" dir="auto">
                {isHe ? "הפוך נתונים לאסטרטגיה" : "Turn data into strategy"}
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto" dir="auto">
                {isHe
                  ? `${totalUsers.toLocaleString()}+ בעלי עסקים כבר בפנים. התחל מחיבור נתונים או תוכנית ראשונה.`
                  : `${totalUsers.toLocaleString()}+ business owners inside. Start by connecting data or your first plan.`}
              </p>
            </>
          )}
        </motion.section>

        <BusinessPulseBar
          healthTotal={healthTotal}
          connectedSources={connectedCount}
          bottleneckCount={bottlenecks.filter((b) => b.severity === "critical" || b.severity === "warning").length}
          planCount={plans.length}
          streakWeeks={streak.currentStreak}
          completedModules={completedModules}
          totalModules={modules.length}
        />

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <InsightFeed
              bottlenecks={bottlenecks}
              pulse={pulse}
              graph={graph}
              hasDiff={hasDiff}
              planCount={plans.length}
              masteryFeatures={new Set(mastery.features || [])}
            />
          </div>
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-lg font-bold text-foreground px-1" dir="auto">
              {isHe ? "פעולות מהירות" : "Quick actions"}
            </h2>
            <Card>
              <CardContent className="p-4 grid gap-2">
                <Button className="w-full justify-start gap-2" variant={connectedCount === 0 ? "default" : "outline"} onClick={() => navigate("/data")}>
                  <Database className="h-4 w-4" />
                  {isHe ? "חבר מקור נתונים" : "Connect data source"}
                </Button>
                <Button className="w-full justify-start gap-2" variant="outline" onClick={() => navigate("/wizard")}>
                  <Wand2 className="h-4 w-4" />
                  {isHe ? "תוכנית חדשה" : "New plan"}
                </Button>
                <Button className="w-full justify-start gap-2" variant="outline" onClick={() => navigate("/differentiate")}>
                  <Compass className="h-4 w-4" />
                  {isHe ? "בידול" : "Differentiation"}
                </Button>
                <Button className="w-full justify-start gap-2" variant="outline" onClick={() => navigate(plans.length ? `/strategy/${latestPlan?.id}` : "/strategy")}>
                  <Map className="h-4 w-4" />
                  {t("navStrategyCanvas")}
                </Button>
              </CardContent>
            </Card>
            {connectedCount === 0 && plans.length === 0 && (
              <p className="text-xs text-muted-foreground px-1 text-center" dir="auto">
                {isHe ? "חבר את המקור הראשון כדי לפתוח תובנות מותאמות." : "Connect your first source to unlock tailored insights."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;
