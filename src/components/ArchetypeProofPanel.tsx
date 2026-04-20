// ═══════════════════════════════════════════════
// ArchetypeProofPanel — "Your archetype changes your outputs, not just the style"
//
// Shows a side-by-side diff of key recommendations for the user's actual archetype
// vs. one contrast archetype, computed from the same BlackboardState.
// Proves differentiation is semantic (CTA verbs, tab order, copy tone, pipeline order)
// rather than cosmetic (colors only).
//
// Access: all authenticated users (requires blackboard state to be populated).
// ═══════════════════════════════════════════════

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { getArchetypeUIConfig } from "@/lib/archetypeUIConfig";
import type { ArchetypeId } from "@/types/archetype";
import { ChevronRight, Diff, Lightbulb } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

interface OutputDiff {
  dimension: string;
  yours: string;
  theirs: string;
  isDifferent: boolean;
}

// ── Archetype meta for display ─────────────────────────────────────────────

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

// Natural contrast pairs — the archetype that differs most on key dimensions
const CONTRAST_ARCHETYPE: Record<ArchetypeId, ArchetypeId> = {
  strategist: "closer",
  optimizer:  "pioneer",
  pioneer:    "strategist",
  connector:  "closer",
  closer:     "strategist",
};

// ── Diff builder ──────────────────────────────────────────────────────────

function buildDiffs(
  archetypeA: ArchetypeId,
  archetypeB: ArchetypeId,
  lang: "he" | "en",
): OutputDiff[] {
  const cfgA = getArchetypeUIConfig(archetypeA);
  const cfgB = getArchetypeUIConfig(archetypeB);
  if (!cfgA || !cfgB) return [];

  const l = lang;

  const diffs: OutputDiff[] = [
    {
      dimension: l === "he" ? "לשונית ברירת מחדל" : "Default tab",
      yours: cfgA.defaultTab,
      theirs: cfgB.defaultTab,
      isDifferent: cfgA.defaultTab !== cfgB.defaultTab,
    },
    {
      dimension: l === "he" ? "טון כפתור ה-CTA" : "CTA tone",
      yours: cfgA.ctaTone,
      theirs: cfgB.ctaTone,
      isDifferent: cfgA.ctaTone !== cfgB.ctaTone,
    },
    {
      dimension: l === "he" ? "צפיפות מידע" : "Information density",
      yours: cfgA.informationDensity,
      theirs: cfgB.informationDensity,
      isDifferent: cfgA.informationDensity !== cfgB.informationDensity,
    },
    {
      dimension: l === "he" ? "מודולים מודגשים" : "Prominent modules",
      yours: cfgA.prominentModules.slice(0, 2).join(", ") || "—",
      theirs: cfgB.prominentModules.slice(0, 2).join(", ") || "—",
      isDifferent:
        cfgA.prominentModules.slice(0, 2).join() !== cfgB.prominentModules.slice(0, 2).join(),
    },
    {
      dimension: l === "he" ? "מיקוד רגולטורי" : "Regulatory focus",
      yours: cfgA.personalityProfile?.regulatoryFocus ?? "—",
      theirs: cfgB.personalityProfile?.regulatoryFocus ?? "—",
      isDifferent:
        cfgA.personalityProfile?.regulatoryFocus !== cfgB.personalityProfile?.regulatoryFocus,
    },
    {
      dimension: l === "he" ? "סגנון עיבוד" : "Processing style",
      yours: cfgA.personalityProfile?.processingStyle ?? "—",
      theirs: cfgB.personalityProfile?.processingStyle ?? "—",
      isDifferent:
        cfgA.personalityProfile?.processingStyle !== cfgB.personalityProfile?.processingStyle,
    },
    {
      dimension: l === "he" ? "תיאור הסתגלות" : "Adaptation description",
      yours: cfgA.adaptationDescription[l],
      theirs: cfgB.adaptationDescription[l],
      isDifferent: cfgA.adaptationDescription[l] !== cfgB.adaptationDescription[l],
    },
  ];

  // Module order — show first 3 items of workspace order
  const yoursOrder = cfgA.modulesOrder.slice(0, 3).join(" → ");
  const theirsOrder = cfgB.modulesOrder.slice(0, 3).join(" → ");
  diffs.push({
    dimension: l === "he" ? "סדר מודולים (3 ראשונים)" : "Module order (first 3)",
    yours: yoursOrder,
    theirs: theirsOrder,
    isDifferent: yoursOrder !== theirsOrder,
  });

  return diffs;
}

// ── Component ─────────────────────────────────────────────────────────────

export function ArchetypeProofPanel() {
  const { profile } = useArchetype();
  const { language } = useLanguage();
  const l = language as "he" | "en";

  const myArchetype = profile?.archetypeId ?? "optimizer";
  const defaultContrast = CONTRAST_ARCHETYPE[myArchetype];

  const [contrastArchetype, setContrastArchetype] = useState<ArchetypeId>(defaultContrast);

  const diffs = useMemo(
    () => buildDiffs(myArchetype, contrastArchetype, l),
    [myArchetype, contrastArchetype, l],
  );

  const differentCount = diffs.filter((d) => d.isDifferent).length;
  const totalCount = diffs.length;

  const otherArchetypes = (
    ["strategist", "optimizer", "pioneer", "connector", "closer"] as ArchetypeId[]
  ).filter((a) => a !== myArchetype);

  const myLabel = ARCHETYPE_LABELS[myArchetype][l];
  const theirLabel = ARCHETYPE_LABELS[contrastArchetype][l];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Diff className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">
            {l === "he"
              ? "ההוכחה: הארכיטיפ שלך משנה המלצות, לא רק עיצוב"
              : "Proof: Your archetype changes recommendations, not just styling"}
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {l === "he"
            ? `${differentCount} מתוך ${totalCount} פרמטרים שונים בין ${myLabel} ל-${theirLabel}`
            : `${differentCount} of ${totalCount} parameters differ between ${myLabel} and ${theirLabel}`}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contrast selector */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">
            {l === "he" ? "השווה מול:" : "Compare with:"}
          </span>
          {otherArchetypes.map((a) => (
            <Button
              key={a}
              size="sm"
              variant={contrastArchetype === a ? "default" : "outline"}
              className="h-7 text-xs gap-1"
              onClick={() => setContrastArchetype(a)}
            >
              {ARCHETYPE_ICONS[a]} {ARCHETYPE_LABELS[a][l]}
            </Button>
          ))}
        </div>

        {/* Diff table */}
        <Tabs defaultValue="all">
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs">
              {l === "he" ? "הכל" : "All"} ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="different" className="text-xs">
              {l === "he" ? "שונה" : "Different"} ({differentCount})
            </TabsTrigger>
          </TabsList>

          {(["all", "different"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-3">
              <div className="rounded-md border divide-y text-sm">
                {/* Header */}
                <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground">
                  <span>{l === "he" ? "פרמטר" : "Parameter"}</span>
                  <span className="flex items-center gap-1">
                    {ARCHETYPE_ICONS[myArchetype]}
                    {myLabel} ({l === "he" ? "שלך" : "yours"})
                  </span>
                  <span className="flex items-center gap-1">
                    {ARCHETYPE_ICONS[contrastArchetype]}
                    {theirLabel}
                  </span>
                </div>

                {diffs
                  .filter((d) => tab === "all" || d.isDifferent)
                  .map((d, i) => (
                    <div
                      key={i}
                      className={`grid grid-cols-[1fr_1fr_1fr] gap-2 px-3 py-2 ${
                        d.isDifferent ? "bg-background" : "bg-muted/20"
                      }`}
                    >
                      <span className="text-xs font-medium flex items-center gap-1">
                        {d.isDifferent && (
                          <ChevronRight className="h-3 w-3 text-primary flex-shrink-0" />
                        )}
                        {d.dimension}
                      </span>
                      <span
                        className={`text-xs ${
                          d.isDifferent ? "font-semibold text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {d.yours}
                      </span>
                      <span
                        className={`text-xs ${
                          d.isDifferent ? "font-medium text-muted-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {d.theirs}
                      </span>
                    </div>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Insight footer */}
        {differentCount > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
            <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
            <p>
              {l === "he"
                ? `${ARCHETYPE_ICONS[myArchetype]} ${myLabel} מקבל ${differentCount} המלצות שונות מ-${ARCHETYPE_ICONS[contrastArchetype]} ${theirLabel}. ` +
                  "זה לא עיצוב. זה שינוי בתוכן, בסדר המודולים, ובמסרי ה-CTA."
                : `${ARCHETYPE_ICONS[myArchetype]} ${myLabel} receives ${differentCount} different recommendations than ${ARCHETYPE_ICONS[contrastArchetype]} ${theirLabel}. ` +
                  "This is not styling. It's a change in content, module order, and CTA messaging."}
            </p>
          </div>
        )}

        {differentCount === 0 && (
          <div className="flex items-start gap-2 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
            <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              {l === "he"
                ? `${myLabel} ו-${theirLabel} חולקים גישה דומה. נסה להשוות עם ארכיטיפ שונה יותר.`
                : `${myLabel} and ${theirLabel} share a similar approach. Try comparing with a more different archetype.`}
            </p>
          </div>
        )}

        {/* Confidence badge */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-muted-foreground">
            {l === "he" ? "רמת ביטחון בסיווג שלך:" : "Classification confidence:"}
          </span>
          <Badge variant="outline" className="text-xs">
            {profile?.confidenceTier ?? "none"} ({Math.round((profile?.confidence ?? 0) * 100)}%)
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
