import { useMemo, useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useArchetype } from "@/contexts/ArchetypeContext";
import InsightCard, { InsightVariant } from "@/components/InsightCard";
import type { Bottleneck } from "@/engine/bottleneckEngine";
import { getRecommendedNextStep } from "@/engine/nextStepEngine";
import type { WeeklyPulse } from "@/engine/pulseEngine";
import type { UserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import {
  captureRecommendationShown,
  captureVariantPick,
  captureOutcome,
  buildContextSnapshot,
} from "@/engine/outcomeLoopEngine";
import { ThumbsUp, RefreshCw, X } from "lucide-react";

interface FeedItem {
  id: string;
  variant: InsightVariant;
  title: string;
  description: string;
  route: string;
}

interface InsightFeedProps {
  bottlenecks: Bottleneck[];
  pulse: WeeklyPulse | null;
  graph: UserKnowledgeGraph;
  hasDiff: boolean;
  planCount: number;
  masteryFeatures: Set<string>;
  healthScore?: number | null;
  connectedSources?: number;
}

const moduleRoute: Record<Bottleneck["module"], string> = {
  differentiation: "/differentiate",
  marketing: "/wizard",
  sales: "/sales",
  pricing: "/pricing",
  retention: "/retention",
};

// ── Tracked card with Midjourney-style variant-pick micro-buttons ─────

interface TrackedInsightCardProps {
  item: FeedItem;
  position: number;
  language: string;
  userId: string | null;
  archetypeId: string;
  confidenceTier: string;
  contextSnapshot: Record<string, unknown>;
  onNavigate: (route: string) => void;
  onSkip: (itemId: string) => void;
}

function TrackedInsightCard({
  item,
  position,
  language,
  userId,
  archetypeId,
  confidenceTier,
  contextSnapshot,
  onNavigate,
  onSkip,
}: TrackedInsightCardProps) {
  const isHe = language === "he";
  const recIdRef = useRef<string | null>(null);
  // Micro-behavior: track hover start time
  const hoverStartRef = useRef<number | null>(null);

  // Log recommendation shown once on mount
  useEffect(() => {
    recIdRef.current = captureRecommendationShown({
      user_id: userId,
      archetype_id: archetypeId,
      confidence_tier: confidenceTier,
      source: "insight_feed",
      action_id: item.id,
      action_label_en: item.title,
      context_snapshot: contextSnapshot,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const recId = () => recIdRef.current ?? item.id;
  const hoverMs = () =>
    hoverStartRef.current !== null ? Date.now() - hoverStartRef.current : null;

  const handlePrimary = () => {
    captureVariantPick(recId(), "primary", position, userId, hoverMs());
    captureOutcome(recId(), userId, "navigated");
    onNavigate(item.route);
  };

  const handleVariation = () => {
    captureVariantPick(recId(), "variation", position, userId, hoverMs());
    onNavigate(item.route);
  };

  const handleSkip = () => {
    captureVariantPick(recId(), "skip", position, userId, hoverMs());
    captureOutcome(recId(), userId, "dismissed");
    onSkip(item.id);
  };

  return (
    <div
      className="group relative"
      onMouseEnter={() => { hoverStartRef.current = Date.now(); }}
      onMouseLeave={() => { hoverStartRef.current = null; }}
    >
      <InsightCard
        language={language as "he" | "en"}
        variant={item.variant}
        title={item.title}
        description={item.description}
        onClick={handlePrimary}
      />
      {/* Variant-pick micro-buttons — appear on hover / focus-within */}
      <div
        className="absolute bottom-2 end-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
        aria-label={isHe ? "פעולות כרטיס" : "Card actions"}
      >
        <button
          onClick={(e) => { e.stopPropagation(); handlePrimary(); }}
          className="flex items-center gap-1 rounded-md bg-background/95 border border-border px-2 py-1 text-xs text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          title={isHe ? "קח פעולה זו" : "Use this"}
        >
          <ThumbsUp className="h-3 w-3" />
          {isHe ? "פעל" : "Use"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleVariation(); }}
          className="flex items-center gap-1 rounded-md bg-background/95 border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
          title={isHe ? "נסה גישה אחרת" : "Try a variation"}
        >
          <RefreshCw className="h-3 w-3" />
          {isHe ? "חלופה" : "Alt"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleSkip(); }}
          className="flex items-center gap-1 rounded-md bg-background/95 border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          title={isHe ? "לא רלוונטי כרגע" : "Not relevant now"}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Main feed ─────────────────────────────────────────────────────────

const InsightFeed = ({
  bottlenecks,
  pulse,
  graph,
  hasDiff,
  planCount,
  masteryFeatures,
  healthScore = null,
  connectedSources = 0,
}: InsightFeedProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectiveArchetypeId, confidenceTier, profile } = useArchetype();
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  const contextSnapshot = useMemo(
    () =>
      buildContextSnapshot({
        planCount,
        healthScore,
        connectedSources,
        archetypeConfidence: profile.confidence,
        language,
      }),
    [planCount, healthScore, connectedSources, profile.confidence, language],
  );

  const items = useMemo(() => {
    const list: FeedItem[] = [];

    for (const b of bottlenecks.slice(0, 4)) {
      list.push({
        id: b.id,
        variant: b.severity === "critical" ? "bottleneck" : b.severity === "warning" ? "module" : "opportunity",
        title: b.title[language],
        description: b.description[language],
        route: moduleRoute[b.module],
      });
    }

    const next = getRecommendedNextStep(graph, hasDiff, planCount, masteryFeatures);
    list.push({
      id: "next-step",
      variant: "module",
      title: next.title[language],
      description: next.description[language],
      route: next.route,
    });

    if (pulse) {
      list.push({
        id: "pulse-insight",
        variant: "pulse",
        title: pulse.greeting[language],
        description: pulse.insightOfTheWeek[language],
        route: "/strategy",
      });
      if (pulse.lossFramedMessages[0]) {
        list.push({
          id: "pulse-loss",
          variant: "pulse",
          title: language === "he" ? "תזכורת" : "Reminder",
          description: pulse.lossFramedMessages[0].message[language],
          route: "/wizard",
        });
      }
    }

    return list;
  }, [bottlenecks, pulse, graph, hasDiff, planCount, masteryFeatures, language]);

  const handleSkip = (id: string) =>
    setSkippedIds((prev) => new Set([...prev, id]));

  const visibleItems = items.filter((it) => !skippedIds.has(it.id));

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground px-1" dir="auto">
        {language === "he" ? "זרם תובנות" : "Intelligence feed"}
      </h2>
      <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pe-1">
        {visibleItems.map((item, idx) => (
          <TrackedInsightCard
            key={item.id}
            item={item}
            position={idx}
            language={language}
            userId={user?.id ?? null}
            archetypeId={effectiveArchetypeId}
            confidenceTier={confidenceTier}
            contextSnapshot={contextSnapshot}
            onNavigate={(route) => navigate(route)}
            onSkip={handleSkip}
          />
        ))}
        {visibleItems.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4" dir="auto">
            {language === "he"
              ? "כל התובנות טופלו — כל הכבוד!"
              : "All insights addressed — great work!"}
          </p>
        )}
      </div>
    </div>
  );
};

export default InsightFeed;
