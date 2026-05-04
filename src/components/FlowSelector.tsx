// ═══════════════════════════════════════════════
// FlowSelector — two-option entry flow driven by differentiationPhases.
//
// Presented after the prospect profile is established (ProspectWelcomeScreen
// or IdentityPrompt). The user picks one path:
//
//   A. כניסה מהירה (Quick win)
//      → Skip to the insight dashboard immediately.
//      → Engine fills gaps with what we know from prospect profile.
//      → Good for: high-ability users who want results fast.
//
//   B. מיפוי מלא (Full mapping)
//      → Runs the 5-phase differentiationPhases engine (wizard).
//      → Deep positioning work: surface → contradiction → hidden → market → synthesis.
//      → Good for: users who want a solid strategic foundation.
//
// The recommended option is selected based on the prospect's weakestLeg:
//   motivation → recommend B (needs conviction before acting)
//   ability    → recommend A (time-constrained, show value fast)
//   trigger    → recommend B (ready to invest, go deep)
// ═══════════════════════════════════════════════

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { Zap, Map } from "lucide-react";
import { PHASES } from "@/viewmodels";
import type { ProspectProfile, FoggLeg } from "@/viewmodels";
import { cn } from "@/lib/utils";

export type SelectedFlow = "quick" | "full";

interface FlowSelectorProps {
  profile: ProspectProfile | null;
  onSelect: (flow: SelectedFlow) => void;
}

function getRecommendedFlow(weakestLeg: FoggLeg): SelectedFlow {
  if (weakestLeg === "ability") return "quick";
  return "full";
}

export default function FlowSelector({ profile, onSelect }: FlowSelectorProps) {
  const { language } = useLanguage();
  const weakestLeg: FoggLeg = profile?.weakestLeg ?? "motivation";
  const recommended = getRecommendedFlow(weakestLeg);

  // Surface the first 3 phases as a preview of the full mapping flow
  const phasePreview = PHASES.slice(0, 3);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-4">
        <div className="text-center space-y-1 mb-6">
          <h1 className="text-2xl font-bold" dir="auto">
            {tx({ he: "איך נתחיל?", en: "How should we start?" }, language)}
          </h1>
          <p className="text-sm text-muted-foreground" dir="auto">
            {tx(
              {
                he: "בחר את הנתיב שמתאים לך עכשיו - אפשר לשנות בכל עת",
                en: "Choose the path that fits you now - you can change anytime",
              },
              language,
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* ─── Option A: Quick win ─────────────────────────────────────────── */}
          <Card
            className={cn(
              "cursor-pointer border-2 transition-colors hover:border-primary",
              recommended === "quick" ? "border-primary bg-primary/5" : "border-border",
            )}
            onClick={() => onSelect("quick")}
          >
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="font-semibold" dir="auto">
                    {tx({ he: "כניסה מהירה", en: "Quick start" }, language)}
                  </span>
                </div>
                {recommended === "quick" && (
                  <Badge className="text-xs">
                    {tx({ he: "מומלץ", en: "Recommended" }, language)}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground" dir="auto">
                {tx(
                  {
                    he: "קפוץ ישר לדשבורד - נמלא את הפערים בדרך",
                    en: "Jump straight to the dashboard - we'll fill gaps along the way",
                  },
                  language,
                )}
              </p>

              <ul className="space-y-1 text-xs text-muted-foreground" dir="auto">
                <li>✓ {tx({ he: "תוצאות מיידיות", en: "Immediate results" }, language)}</li>
                <li>✓ {tx({ he: "~2 דקות להתחלה", en: "~2 min to get started" }, language)}</li>
                <li>✓ {tx({ he: "אפשר להעמיק אחר כך", en: "Go deeper later" }, language)}</li>
              </ul>

              <Button className="w-full" size="sm" onClick={(e) => { e.stopPropagation(); onSelect("quick"); }}>
                {tx({ he: "קדימה →", en: "Go →" }, language)}
              </Button>
            </CardContent>
          </Card>

          {/* ─── Option B: Full mapping ───────────────────────────────────────── */}
          <Card
            className={cn(
              "cursor-pointer border-2 transition-colors hover:border-primary",
              recommended === "full" ? "border-primary bg-primary/5" : "border-border",
            )}
            onClick={() => onSelect("full")}
          >
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-primary" />
                  <span className="font-semibold" dir="auto">
                    {tx({ he: "מיפוי מלא", en: "Full mapping" }, language)}
                  </span>
                </div>
                {recommended === "full" && (
                  <Badge className="text-xs">
                    {tx({ he: "מומלץ", en: "Recommended" }, language)}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground" dir="auto">
                {tx(
                  {
                    he: "5 שלבים לבידול אמיתי - מה שרוב העסקים מפספסים",
                    en: "5 phases to real differentiation - what most businesses miss",
                  },
                  language,
                )}
              </p>

              {/* Phase preview */}
              <div className="space-y-1">
                {phasePreview.map((phase) => (
                  <div key={phase.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: phase.color }}
                    />
                    <span dir="auto">{phase.title[language]}</span>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground ps-4">
                  + {PHASES.length - phasePreview.length} {tx({ he: "עוד שלבים", en: "more phases" }, language)}
                </div>
              </div>

              <Button
                className="w-full"
                size="sm"
                variant={recommended === "full" ? "default" : "outline"}
                onClick={(e) => { e.stopPropagation(); onSelect("full"); }}
              >
                {tx({ he: "התחל מיפוי", en: "Start mapping" }, language)}
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-2" dir="auto">
          {tx(
            {
              he: "שני הנתיבים מובילים לאותו מקום - רק הקצב שונה",
              en: "Both paths lead to the same destination - just at different speeds",
            },
            language,
          )}
        </p>
      </div>
    </div>
  );
}
