// ═══════════════════════════════════════════════
// ArchetypeProfileCard — Glass Box user-facing card
// Shows the user their detected archetype, confidence,
// top contributing signals, and an option to override.
// Visible to all authenticated users.
// ═══════════════════════════════════════════════

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { tx } from "@/i18n/tx";
import { ChevronDown, Sparkles, Loader2 } from "lucide-react";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ArchetypeId } from "@/types/archetype";
import { deriveHeuristicSet } from "@/engine/behavioralHeuristicEngine";

// ═══════════════════════════════════════════════
// METADATA
// ═══════════════════════════════════════════════

const ARCHETYPE_ICONS: Record<ArchetypeId, string> = {
  strategist: "🎯",
  optimizer:  "📈",
  pioneer:    "🚀",
  connector:  "🤝",
  closer:     "⚡",
};

const ARCHETYPE_LABELS: Record<ArchetypeId, { he: string; en: string }> = {
  strategist: { he: "האסטרטג", en: "The Strategist" },
  optimizer:  { he: "האופטימייזר", en: "The Optimizer" },
  pioneer:    { he: "החלוץ", en: "The Pioneer" },
  connector:  { he: "המחבר", en: "The Connector" },
  closer:     { he: "הסגרן", en: "The Closer" },
};

const ARCHETYPE_DESCRIPTIONS: Record<ArchetypeId, { he: string; en: string }> = {
  strategist: {
    he: "אתה בונה מתוך נתונים — סידרנו לך את הכלים בהתאם",
    en: "You build from data — we've arranged your tools accordingly",
  },
  optimizer: {
    he: "אתה מוכוון שיפור — הדאשבורד שלך מחדד לנתונים הכי רלוונטיים",
    en: "You're improvement-focused — your dashboard is tuned to the most relevant data",
  },
  pioneer: {
    he: "אתה בונה משהו חדש — הובלנו אותך ישר לבנייה",
    en: "You're building something new — we took you straight to building mode",
  },
  connector: {
    he: "הלקוחות שלך הם הלב — שמנו retention בקדמת הבמה",
    en: "Your customers are your heart — we put retention front and center",
  },
  closer: {
    he: "אתה סוגר עסקאות — חישלנו לך את הנתיב הכי ישיר",
    en: "You close deals — we sharpened the most direct path for you",
  },
};

const SIGNAL_SOURCE_LABELS: Record<string, { he: string; en: string }> = {
  formData:          { he: "טופס", en: "Form" },
  discProfile:       { he: "DISC", en: "DISC" },
  hormoziValue:      { he: "ערך", en: "Value" },
  retentionFlywheel: { he: "Retention", en: "Retention" },
  churnRisk:         { he: "Churn", en: "Churn" },
  healthScore:       { he: "בריאות", en: "Health" },
  costOfInaction:    { he: "COI", en: "COI" },
  knowledgeGraph:    { he: "גרף ידע", en: "Knowledge" },
};

const ARCHETYPE_IDS: ArchetypeId[] = ["strategist", "optimizer", "pioneer", "connector", "closer"];

// ═══════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════

export default function ArchetypeProfileCard() {
  const { profile, effectiveArchetypeId, confidenceTier, uiConfig, loading, setOverride } = useArchetype();
  const { language } = useLanguage();
  const isHe = language === "he";
  const [signalsOpen, setSignalsOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState(false);

  if (loading) {
    return (
      <Card className="mb-6 border-primary/20">
        <CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tx({ he: "טוען פרופיל...", en: "Loading profile..." }, language)}
        </CardContent>
      </Card>
    );
  }

  // ── Cold start: no pipeline runs yet ──
  if (confidenceTier === "none" && profile.sessionCount === 0) {
    return (
      <Card className="mb-6 border-dashed border-primary/30 bg-primary/3">
        <CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground" dir="auto">
              {tx({ he: "עדיין לומדים אותך", en: "Still learning about you" }, language)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5" dir="auto">
              {isHe
                ? "השלם ריצה אחת כדי לראות את הפרופיל האדפטיבי שלך"
                : "Complete one pipeline run to see your adaptive profile"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const archetype = effectiveArchetypeId;
  const icon = ARCHETYPE_ICONS[archetype];
  const label = ARCHETYPE_LABELS[archetype][tx({ he: "he", en: "en" }, language)];
  const description = ARCHETYPE_DESCRIPTIONS[archetype][tx({ he: "he", en: "en" }, language)];
  const confidencePercent = Math.round(profile.confidence * 100);

  // Top 5 signals by total delta
  const topSignals = [...profile.signalHistory]
    .sort((a, b) => {
      const sumA = Object.values(a.deltas).reduce((s, v) => s + (v ?? 0), 0);
      const sumB = Object.values(b.deltas).reduce((s, v) => s + (v ?? 0), 0);
      return sumB - sumA;
    })
    .slice(0, 5);

  const isTentative = confidenceTier === "tentative";
  const isOverridden = !!profile.overrideByUser;

  return (
    <Card className={`mb-6 transition-all ${isTentative ? "opacity-75" : ""} border-primary/20 bg-gradient-to-r from-primary/4 to-transparent`}>
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" role="img" aria-label={label}>{icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground" dir="auto">
                  {label}
                </span>
                {isTentative && (
                  <Badge variant="outline" className="text-xs py-0">
                    {tx({ he: "משערים", en: "Tentative" }, language)}
                  </Badge>
                )}
                {isOverridden && (
                  <Badge variant="outline" className="text-xs py-0 border-amber-500 text-amber-600">
                    {tx({ he: "ידני", en: "Manual" }, language)}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5" dir="auto">{description}</p>
            </div>
          </div>

          {/* Confidence display */}
          {!isTentative && profile.confidence > 0 && (
            <div className="text-end shrink-0">
              <div className="text-lg font-bold tabular-nums text-primary">
                {confidencePercent}%
              </div>
              <div className="text-xs text-muted-foreground">
                {tx({ he: "ביטחון", en: "confidence" }, language)}
              </div>
            </div>
          )}
        </div>

        {/* Confidence progress bar */}
        {profile.confidence > 0 && (
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        )}

        {/* Signals accordion */}
        {topSignals.length > 0 && (
          <Collapsible open={signalsOpen} onOpenChange={setSignalsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${signalsOpen ? "rotate-180" : ""}`} />
                {tx({ he: "מה הגיע לכאן?", en: "What drove this?" }, language)}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-1.5">
                {topSignals.map((sig, i) => {
                  const sourceLabel = SIGNAL_SOURCE_LABELS[sig.source]?.[tx({ he: "he", en: "en" }, language)] ?? sig.source;
                  const totalDelta = Object.values(sig.deltas).reduce((s, v) => s + (v ?? 0), 0);
                  return (
                    <div key={i} className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Badge variant="secondary" className="text-xs py-0 px-1.5 shrink-0">{sourceLabel}</Badge>
                        <span className="text-muted-foreground truncate">{sig.field.split(".").pop()}</span>
                        <span className="font-medium text-foreground truncate">{String(sig.value)}</span>
                      </div>
                      <span className="text-green-600 dark:text-green-400 font-medium shrink-0">+{totalDelta}</span>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Glass-Box: Why this adapts your experience */}
        {(confidenceTier === "confident" || confidenceTier === "strong") && (
          <Collapsible open={whyOpen} onOpenChange={setWhyOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${whyOpen ? "rotate-180" : ""}`} />
                {tx({ he: "למה זה מותאם עבורך?", en: "Why this adapts your experience?" }, language)}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {(() => {
                const profile_ = uiConfig.personalityProfile;
                const heuristics = deriveHeuristicSet(archetype).activeHeuristics;
                return (
                  <div className="mt-2 space-y-2">
                    {/* Regulatory focus + processing style badges */}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs py-0 px-1.5">
                        {profile_.regulatoryFocus === "prevention"
                          ? (tx({ he: "מניעה", en: "Prevention Focus" }, language))
                          : (tx({ he: "קידום", en: "Promotion Focus" }, language))}
                      </Badge>
                      <Badge variant="outline" className="text-xs py-0 px-1.5">
                        {profile_.processingStyle === "systematic"
                          ? (tx({ he: "שיטתי", en: "Systematic" }, language))
                          : (tx({ he: "היוריסטי", en: "Heuristic" }, language))}
                      </Badge>
                    </div>
                    {/* Core motivation */}
                    <p className="text-xs text-muted-foreground italic" dir="auto">
                      {profile_.coreMotivation[tx({ he: "he", en: "en" }, language)]}
                    </p>
                    {/* Active heuristic badges */}
                    <div className="flex flex-wrap gap-1">
                      {heuristics.map((h) => (
                        <Badge
                          key={h.id}
                          variant="secondary"
                          className="text-xs py-0 px-1.5"
                          title={h.source}
                        >
                          {h.id}: {h.principle}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Override control */}
        {!editingOverride ? (
          <button
            className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
            onClick={() => setEditingOverride(true)}
          >
            {tx({ he: "שנה ידנית", en: "Change manually" }, language)}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Select
              value={profile.overrideByUser ?? "auto"}
              onValueChange={(val) => {
                setOverride(val === "auto" ? null : val as ArchetypeId);
                setEditingOverride(false);
              }}
            >
              <SelectTrigger className="flex-1 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{tx({ he: "אוטומטי", en: "Automatic" }, language)}</SelectItem>
                {ARCHETYPE_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {ARCHETYPE_ICONS[id]} {ARCHETYPE_LABELS[id][tx({ he: "he", en: "en" }, language)]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setEditingOverride(false)}
            >
              {tx({ he: "ביטול", en: "Cancel" }, language)}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
