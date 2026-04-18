import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { Badge } from "@/components/ui/badge";
import { Flame, User, Sparkles } from "lucide-react";
import { tx } from "@/i18n/tx";
import { getStreak } from "@/engine/weeklyLoopEngine";
import type { ConfidenceTier } from "@/types/archetype";

/**
 * Thin transparency strip surfacing the system's inferred identity for the user.
 *
 * Closes the "who does this system think I am?" loop by exposing:
 *   - Effective archetype (label) — what persona drives the UI
 *   - Confidence tier — how sure the system is
 *   - Weekly loop streak — consistency signal
 *
 * Includes a low-friction escape hatch ("זה לא אני" → /archetype) so users
 * can correct a wrong inference without buried-in-settings friction.
 *
 * Renders nothing when the user is still in cold-start ("none" tier) and
 * has no streak — avoids showing empty/useless data.
 */
export default function IdentityStrip() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { uiConfig, confidenceTier, loading } = useArchetype();
  const streak = getStreak();

  if (loading) return null;
  // Hide completely when we have nothing meaningful to say
  if (confidenceTier === "none" && streak === 0) return null;

  const tierLabel = tx(
    confidenceTier === "strong"
      ? { he: "זיהוי חזק", en: "Strong match" }
      : confidenceTier === "confident"
        ? { he: "זיהוי בטוח", en: "Confident" }
        : confidenceTier === "tentative"
          ? { he: "זיהוי ראשוני", en: "Early signal" }
          : { he: "לומדים אותך", en: "Still learning" },
    language,
  );

  const tierTone: Record<ConfidenceTier, string> = {
    strong: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    confident: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    tentative: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    none: "bg-muted text-muted-foreground",
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground px-1" dir="auto">
      {confidenceTier !== "none" && (
        <>
          <Badge
            className={tierTone[confidenceTier]}
            variant="secondary"
            title={tx(
              { he: "מבוסס על: תחום עסקי, קהל יעד, מטרה ואופן קבלת החלטות", en: "Based on: industry, audience, goal, and decision patterns" },
              language,
            )}
          >
            <User className="h-3 w-3 me-1" />
            {uiConfig.label[language]}
          </Badge>
          <span className="text-muted-foreground/70">·</span>
          <span dir="auto">{tierLabel}</span>
        </>
      )}

      {streak > 0 && (
        <>
          {confidenceTier !== "none" && <span className="text-muted-foreground/70">·</span>}
          <span className="inline-flex items-center gap-1 text-foreground/80">
            <Flame className="h-3 w-3 text-orange-500" />
            {tx(
              streak === 1
                ? { he: "שבוע אחד ברצף", en: "1-week streak" }
                : { he: `${streak} שבועות ברצף`, en: `${streak}-week streak` },
              language,
            )}
          </span>
        </>
      )}

      {/* Only offer the correction path when there's an actual inference to correct */}
      {confidenceTier !== "none" && (
        <button
          type="button"
          onClick={() => navigate("/archetype")}
          className="ms-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          <Sparkles className="h-3 w-3" />
          {tx({ he: "זה לא אני?", en: "Not me?" }, language)}
        </button>
      )}
    </div>
  );
}
