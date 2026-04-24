// ═══════════════════════════════════════════════
// src/components/moat/PrincipleTraceModal.tsx
//
// Single UI surface for the principle grounding layer. Renders a
// flag-gated trigger button + a modal dialog that shows the
// research-backed trace for a DifferentiationResult.
//
// Contract:
// - Caller (DifferentiationResultView) renders this component
//   inside its own flag guard. When the flag is off the caller
//   simply does not mount this component — zero DOM delta (T5).
// - The modal computes the trace lazily on first open. The trace is
//   memoized on the result identity so repeated opens are cheap.
// - Each principle card exposes its research_backbone and source
//   docs. A surface with no mapped principles renders an explicit
//   "no research mapping yet" line rather than being hidden (T4).
// ═══════════════════════════════════════════════

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { DifferentiationResult } from "@/types/differentiation";
import { enrichDifferentiationWithCitations } from "@/engine/moat/principleTraceEnricher";
import { libraryVersion } from "@/engine/moat/principleLibrary";
import type { PrincipleTrace } from "@/engine/moat/types";

interface Props {
  result: DifferentiationResult;
}

function surfaceLabel(
  t: PrincipleTrace,
  isHe: boolean,
): string {
  if (t.surface.kind === "hidden_value") {
    const prefix = isHe ? "ערך נסתר" : "Hidden value";
    return `${prefix}: ${t.surface.id}`;
  }
  const prefix = isHe ? "ארכיטיפ מתחרה" : "Competitor archetype";
  return `${prefix}: ${t.surface.id}`;
}

/**
 * Renders the trigger button + modal. Safe to render unconditionally;
 * parent controls whether this component is mounted at all (flag gate).
 */
const PrincipleTraceModal = ({ result }: Props) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [open, setOpen] = useState(false);

  // Lazily compute the trace only when the modal is first opened, then
  // memoize so repeat opens are cheap. Memoization key is result.id
  // (stable per DifferentiationResult) — if upstream regenerates,
  // a new result.id arrives and the trace recomputes once.
  const trace = useMemo<PrincipleTrace[] | null>(() => {
    if (!open) return null;
    return enrichDifferentiationWithCitations(result);
  }, [open, result]);

  const emptyTrace = trace !== null && trace.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookOpen className="h-4 w-4" />
          {isHe ? "על מה זה מבוסס" : "Research trace"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isHe
              ? "מקורות מחקריים לבידול"
              : "Research foundations for this differentiation"}
          </DialogTitle>
          <DialogDescription>
            {isHe
              ? `ספריית principles גרסה ${libraryVersion()} — המלצות מבוססות מחקר בעל שם.`
              : `Principle library v${libraryVersion()} — recommendations grounded in named research.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {emptyTrace && (
            <p className="text-sm text-muted-foreground" dir="auto">
              {isHe
                ? "לא זוהו ערכים נסתרים או ארכיטיפים ב-result. הריץ את ה-wizard במלואו כדי לראות מקורות."
                : "No hidden values or archetypes detected in result. Complete the wizard to see sources."}
            </p>
          )}

          {trace?.map((entry, i) => (
            <Card key={i} className="border-s-4 border-s-primary/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {surfaceLabel(entry, isHe)}
                  </Badge>
                  {entry.surface.kind === "hidden_value" && (
                    <Badge variant="secondary" className="text-xs">
                      {isHe ? "ציון" : "Score"}: {entry.surface.score}
                    </Badge>
                  )}
                </div>

                {entry.principles.length === 0 && (
                  <p className="text-xs text-muted-foreground italic" dir="auto">
                    {isHe
                      ? "עוד אין מיפוי מחקרי עבור הערך הזה בגרסה הנוכחית של ה-library."
                      : "No research mapping yet for this surface in the current library version."}
                  </p>
                )}

                {entry.principles.map((p) => (
                  <div
                    key={p.principle_id}
                    className="rounded-md border border-border/50 p-3 space-y-2 bg-muted/20"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="text-xs">{p.principle_id}</Badge>
                      <span className="text-sm font-bold" dir="auto">
                        {isHe ? p.name_he : p.name_en}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground" dir="auto">
                      {p.definition_he}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold">
                        {isHe ? "חוקרים:" : "Researchers:"}
                      </span>
                      {p.research_backbone.map((r, idx) => (
                        <Badge key={idx} variant="outline" className="text-[10px]">
                          {r}
                        </Badge>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold">
                        {isHe
                          ? `מסמכי מקור (${p.sources.length}):`
                          : `Source docs (${p.sources.length}):`}
                      </span>
                      {p.sources.map((s) => (
                        <div
                          key={s.id}
                          className="text-[11px] text-muted-foreground border-s-2 border-s-accent/40 ps-2"
                          dir="auto"
                        >
                          <span className="font-mono text-accent">{s.id}</span>{" "}
                          <span className="opacity-70">· {s.course}</span>
                          {s.core_claim && s.core_claim !== "[META]" && (
                            <div className="mt-0.5 italic">{s.core_claim}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrincipleTraceModal;
