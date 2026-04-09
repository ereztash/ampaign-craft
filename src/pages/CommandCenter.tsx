import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useAchievements } from "@/hooks/useAchievements";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { getRecommendedNextStep } from "@/engine/nextStepEngine";
import { generateWeeklyPulse } from "@/engine/pulseEngine";
import { analyzeBottlenecks } from "@/engine/bottleneckEngine";
import { SavedPlan } from "@/types/funnel";
import BusinessPulseBar from "@/components/BusinessPulseBar";
import InsightFeed from "@/components/InsightFeed";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  Sparkles,
  Rocket,
  Crosshair,
  Map,
  Database,
  Flame,
  ArrowLeft,
} from "lucide-react";

const CommandCenter = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { streak, mastery } = useAchievements(language);

  const mp = reducedMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  // Load saved plans
  const savedPlans = useMemo<SavedPlan[]>(() => {
    try { return JSON.parse(localStorage.getItem("funnelforge-plans") || "[]"); } catch { return []; }
  }, []);

  const latestPlan = savedPlans.length > 0
    ? [...savedPlans].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0]
    : null;

  const hasDiff = typeof window !== "undefined" && !!localStorage.getItem("funnelforge-differentiation-result");

  // Build knowledge graph
  const graph = useMemo(() => {
    if (profile.lastFormData) return buildUserKnowledgeGraph(profile.lastFormData);
    return null;
  }, [profile.lastFormData]);

  // Bottleneck analysis
  const analysis = useMemo(
    () => analyzeBottlenecks(latestPlan?.result || null, graph, hasDiff, savedPlans.length),
    [latestPlan, graph, hasDiff, savedPlans.length]
  );

  // Weekly pulse
  const pulse = useMemo(() => generateWeeklyPulse(savedPlans), [savedPlans]);

  // Next step
  const nextStep = useMemo(() => {
    const g = graph || buildUserKnowledgeGraph({
      businessField: "", audienceType: "b2c", ageRange: [25, 55], interests: "",
      productDescription: "", averagePrice: 0, salesModel: "oneTime",
      budgetRange: "medium", mainGoal: "sales", existingChannels: [], experienceLevel: "beginner",
    });
    return getRecommendedNextStep(g, hasDiff, savedPlans.length, new Set((mastery as any).features || []));
  }, [graph, hasDiff, savedPlans.length, mastery]);

  // Count "data sources" — business profile + diff + imported data + meta
  const dataSourceCount = useMemo(() => {
    let count = 0;
    if (profile.lastFormData) count++; // Business profile
    if (hasDiff) count++; // Differentiation
    try {
      const imported = JSON.parse(localStorage.getItem("funnelforge-imported-data") || "[]");
      if (imported.length > 0) count++;
    } catch { /* ignore */ }
    return count;
  }, [profile.lastFormData, hasDiff]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      {/* Greeting */}
      <motion.div {...mp}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" dir="auto">
              {graph?.derived.identityStatement[language] || (isHe ? "מרכז הבקרה" : "Command Center")}
            </h1>
            <p className="text-sm text-muted-foreground" dir="auto">
              {isHe
                ? "תמונה מלאה של העסק שלך — תובנות, חסמים ופעולות מומלצות"
                : "Full picture of your business — insights, bottlenecks, and recommended actions"}
            </p>
          </div>
          {streak.currentStreak > 0 && (
            <Badge className="gap-1 text-sm">
              <Flame className="h-4 w-4" /> {streak.currentStreak} {isHe ? "שבועות" : "weeks"}
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Business Pulse Bar — key metrics */}
      <motion.div {...(reducedMotion ? {} : { ...mp, transition: { duration: 0.4, delay: 0.1 } })}>
        <BusinessPulseBar
          analysis={analysis}
          dataSourceCount={dataSourceCount}
          planCount={savedPlans.length}
          streak={streak.currentStreak}
        />
      </motion.div>

      {/* Recommended Next Step */}
      <motion.div {...(reducedMotion ? {} : { ...mp, transition: { duration: 0.4, delay: 0.15 } })}>
        <Card
          role="button"
          tabIndex={0}
          className="border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent cursor-pointer hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary"
          onClick={() => navigate(nextStep.route)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(nextStep.route); }}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
              <Sparkles className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-bold text-foreground" dir="auto">{nextStep.title[language]}</h3>
                <Badge className="text-xs bg-amber-500 text-white">{isHe ? "מומלץ" : "Recommended"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground" dir="auto">{nextStep.description[language]}</p>
            </div>
            <span className="text-lg text-muted-foreground">→</span>
          </CardContent>
        </Card>
      </motion.div>

      {/* Intelligence Feed — bottlenecks & insights */}
      <motion.div {...(reducedMotion ? {} : { ...mp, transition: { duration: 0.4, delay: 0.2 } })}>
        <InsightFeed
          analysis={analysis}
          pulseMessage={pulse?.greeting}
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.div {...(reducedMotion ? {} : { ...mp, transition: { duration: 0.4, delay: 0.25 } })}>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {isHe ? "פעולות מהירות" : "Quick Actions"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card
            role="button" tabIndex={0}
            className="cursor-pointer hover:shadow-md transition-all border hover:border-primary/30"
            onClick={() => navigate("/data")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/data"); }}
          >
            <CardContent className="p-3 text-center">
              <Database className="h-5 w-5 text-primary mx-auto mb-1.5" />
              <p className="text-xs font-medium">{isHe ? "חבר מידע" : "Connect Data"}</p>
            </CardContent>
          </Card>
          <Card
            role="button" tabIndex={0}
            className="cursor-pointer hover:shadow-md transition-all border hover:border-primary/30"
            onClick={() => navigate("/wizard")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/wizard"); }}
          >
            <CardContent className="p-3 text-center">
              <Rocket className="h-5 w-5 text-accent mx-auto mb-1.5" />
              <p className="text-xs font-medium">{isHe ? "תוכנית חדשה" : "New Plan"}</p>
            </CardContent>
          </Card>
          <Card
            role="button" tabIndex={0}
            className="cursor-pointer hover:shadow-md transition-all border hover:border-primary/30"
            onClick={() => navigate("/differentiate")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/differentiate"); }}
          >
            <CardContent className="p-3 text-center">
              <Crosshair className="h-5 w-5 text-amber-500 mx-auto mb-1.5" />
              <p className="text-xs font-medium">{isHe ? "בידול" : "Differentiate"}</p>
            </CardContent>
          </Card>
          <Card
            role="button" tabIndex={0}
            className="cursor-pointer hover:shadow-md transition-all border hover:border-primary/30"
            onClick={() => navigate("/strategy")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/strategy"); }}
          >
            <CardContent className="p-3 text-center">
              <Map className="h-5 w-5 text-purple-500 mx-auto mb-1.5" />
              <p className="text-xs font-medium">{isHe ? "קנבס אסטרטגי" : "Strategy Canvas"}</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Recent Plans */}
      {savedPlans.length > 0 && (
        <motion.div {...(reducedMotion ? {} : { ...mp, transition: { duration: 0.4, delay: 0.3 } })}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              {isHe ? "תוכניות אחרונות" : "Recent Plans"}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => navigate("/plans")}>
              {isHe ? "הצג הכל" : "View All"}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {savedPlans.slice(0, 4).map((plan) => (
              <Card
                key={plan.id}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate(`/strategy/${plan.id}`)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(plan.savedAt).toLocaleDateString(isHe ? "he-IL" : "en-US")}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost">{isHe ? "פתח" : "Open"}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CommandCenter;
