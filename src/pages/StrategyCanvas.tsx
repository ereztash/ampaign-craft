import { useState, useMemo, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { analyzeBottlenecks, BottleneckModule } from "@/engine/bottleneckEngine";
import { FunnelResult, SavedPlan } from "@/types/funnel";
import { getLatestPlanResult } from "@/lib/minimalFormDefaults";
import StrategyMap from "@/components/StrategyMap";
import InsightCard from "@/components/InsightCard";
import LoadingFallback from "@/components/LoadingFallback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Map, Sparkles, ChevronDown } from "lucide-react";

// Lazy load heavy tab components
const ContentTab = lazy(() => import("@/components/ContentTab"));
const SalesTab = lazy(() => import("@/components/SalesTab"));
const PricingIntelligenceTab = lazy(() => import("@/components/PricingIntelligenceTab"));
const RetentionGrowthTab = lazy(() => import("@/components/RetentionGrowthTab"));
const BrandDiagnosticTab = lazy(() => import("@/components/BrandDiagnosticTab"));
const PlanningTab = lazy(() => import("@/components/PlanningTab"));

const MODULE_TABS: Record<BottleneckModule, string[]> = {
  differentiation: [],
  marketing: ["strategy", "planning", "content"],
  sales: ["sales"],
  pricing: ["pricing"],
  retention: ["retention"],
};

const StrategyCanvas = () => {
  const { planId, focus } = useParams<{ planId?: string; focus?: string }>();
  const { language } = useLanguage();
  const isHe = language === "he";
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  const [activeNode, setActiveNode] = useState<BottleneckModule | null>(
    (focus as BottleneckModule) || null
  );

  // Load plan result
  const { result, plan } = useMemo(() => {
    if (planId) {
      try {
        const plans: SavedPlan[] = JSON.parse(localStorage.getItem("funnelforge-plans") || "[]");
        const found = plans.find((p) => p.id === planId);
        return { result: found?.result || null, plan: found || null };
      } catch { return { result: null, plan: null }; }
    }
    return { result: getLatestPlanResult(), plan: null };
  }, [planId]);

  const hasDiff = typeof window !== "undefined" && !!localStorage.getItem("funnelforge-differentiation-result");

  // Build knowledge graph + analysis
  const graph = useMemo(() => {
    if (result?.formData) return buildUserKnowledgeGraph(result.formData);
    if (profile.lastFormData) return buildUserKnowledgeGraph(profile.lastFormData);
    return null;
  }, [result, profile.lastFormData]);

  const planCount = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("funnelforge-plans") || "[]").length; } catch { return 0; }
  }, []);

  const analysis = useMemo(
    () => analyzeBottlenecks(result, graph, hasDiff, planCount),
    [result, graph, hasDiff, planCount]
  );

  const handleNodeClick = (module: BottleneckModule) => {
    setActiveNode(activeNode === module ? null : module);
  };

  // No result — empty state
  if (!result) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="text-center py-16 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
            <Map className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold" dir="auto">
            {isHe ? "קנבס אסטרטגי" : "Strategy Canvas"}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto" dir="auto">
            {isHe
              ? "צור תוכנית שיווק כדי לראות את הקנבס האסטרטגי שלך — מפת מודולים, חסמים וטקטיקות"
              : "Generate a marketing plan to see your strategy canvas — module map, bottlenecks, and tactics"}
          </p>
          <Button onClick={() => navigate("/wizard")} className="gap-2">
            <Rocket className="h-4 w-4" />
            {isHe ? "צור תוכנית (2 דק')" : "Create Plan (2 min)"}
          </Button>
        </div>
      </div>
    );
  }

  // Active node bottlenecks
  const activeBottlenecks = activeNode
    ? analysis.bottlenecks.filter((b) => b.module === activeNode)
    : [];

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" dir="auto">
            {isHe ? "קנבס אסטרטגי" : "Strategy Canvas"}
          </h1>
          <p className="text-sm text-muted-foreground" dir="auto">
            {result.funnelName?.[language] || (isHe ? "תוכנית השיווק שלך" : "Your Marketing Plan")}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {isHe ? "ציון כללי:" : "Overall:"} {analysis.overallScore}/100
        </Badge>
      </div>

      {/* Strategy Map — visual node graph */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <StrategyMap
            analysis={analysis}
            activeNode={activeNode}
            onNodeClick={handleNodeClick}
          />
        </CardContent>
      </Card>

      {/* Focus Panel — when a node is clicked */}
      <AnimatePresence mode="wait">
        {activeNode && (
          <motion.div
            key={activeNode}
            initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Bottlenecks for this module */}
            {activeBottlenecks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {isHe ? "חסמים וטקטיקות" : "Bottlenecks & Tactics"}
                </h3>
                {activeBottlenecks.map((b) => (
                  <InsightCard key={b.id} bottleneck={b} />
                ))}
              </div>
            )}

            {/* Module-specific content */}
            {activeNode === "differentiation" && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3" dir="auto">
                    {hasDiff
                      ? (isHe ? "הבידול שלך מוגדר — הוא מזין את כל המודולים האחרים" : "Your differentiation is defined — it feeds all other modules")
                      : (isHe ? "הגדר בידול כדי לשפר את כל שאר המודולים" : "Define differentiation to improve all other modules")}
                  </p>
                  <Button onClick={() => navigate("/differentiate")} variant={hasDiff ? "outline" : "default"}>
                    {hasDiff ? (isHe ? "עדכן בידול" : "Update Differentiation") : (isHe ? "התחל תהליך בידול" : "Start Differentiation")}
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeNode === "marketing" && (
              <Suspense fallback={<LoadingFallback />}>
                <Tabs defaultValue="strategy" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="strategy">{isHe ? "אסטרטגיה" : "Strategy"}</TabsTrigger>
                    <TabsTrigger value="planning">{isHe ? "תכנון" : "Planning"}</TabsTrigger>
                    <TabsTrigger value="content">{isHe ? "תוכן" : "Content"}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="strategy">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-3" dir="auto">{isHe ? "שלבי המשפך" : "Funnel Stages"}</h4>
                        <div className="space-y-3">
                          {result.stages.map((stage, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {i + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{stage.name[language]}</p>
                                <p className="text-xs text-muted-foreground">
                                  {stage.channels.map((ch) => ch.name[language]).join(", ")}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {stage.budgetPercent}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="planning">
                    <PlanningTab result={result} />
                  </TabsContent>
                  <TabsContent value="content">
                    <ContentTab result={result} />
                  </TabsContent>
                </Tabs>
              </Suspense>
            )}

            {activeNode === "sales" && (
              <Suspense fallback={<LoadingFallback />}>
                <SalesTab result={result} />
              </Suspense>
            )}

            {activeNode === "pricing" && (
              <Suspense fallback={<LoadingFallback />}>
                <PricingIntelligenceTab result={result} />
              </Suspense>
            )}

            {activeNode === "retention" && (
              <Suspense fallback={<LoadingFallback />}>
                <RetentionGrowthTab result={result} />
              </Suspense>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prompt to click a node */}
      {!activeNode && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <ChevronDown className="h-5 w-5 mx-auto mb-2" />
            <p className="text-sm" dir="auto">
              {isHe ? "לחץ על מודול למעלה כדי לצפות באסטרטגיה, חסמים וטקטיקות" : "Click a module above to view its strategy, bottlenecks, and tactics"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StrategyCanvas;
