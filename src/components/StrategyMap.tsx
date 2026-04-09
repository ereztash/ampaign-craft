import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import type { FunnelResult } from "@/types/funnel";
import type { Bottleneck } from "@/engine/bottleneckEngine";
import { calculateHealthScore } from "@/engine/healthScoreEngine";

const NODES: { id: Bottleneck["module"]; label: { he: string; en: string }; route: string }[] = [
  { id: "differentiation", label: { he: "בידול", en: "Differentiation" }, route: "/differentiate" },
  { id: "marketing", label: { he: "שיווק", en: "Marketing" }, route: "/wizard" },
  { id: "sales", label: { he: "מכירות", en: "Sales" }, route: "/sales" },
  { id: "pricing", label: { he: "תמחור", en: "Pricing" }, route: "/pricing" },
  { id: "retention", label: { he: "שימור", en: "Retention" }, route: "/retention" },
];

interface StrategyMapProps {
  result: FunnelResult;
  bottlenecks: Bottleneck[];
  hasDifferentiation: boolean;
}

const StrategyMap = ({ result, bottlenecks, hasDifferentiation }: StrategyMapProps) => {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const health = calculateHealthScore(result).total;

  const severityByModule = useMemo(() => {
    const m = new Map<Bottleneck["module"], Bottleneck["severity"]>();
    for (const b of bottlenecks) {
      const cur = m.get(b.module);
      if (!cur || (b.severity === "critical" && cur !== "critical")) m.set(b.module, b.severity);
    }
    return m;
  }, [bottlenecks]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-6">
      <h2 className="text-sm font-semibold text-muted-foreground mb-4 text-center" dir="auto">
        {language === "he" ? "מפת אסטרטגיה" : "Strategy map"}
      </h2>
      <div className={`flex flex-col sm:flex-row items-stretch justify-between gap-2 sm:gap-0 ${isRTL ? "sm:flex-row-reverse" : ""}`}>
        {NODES.map((node, i) => {
          const sev = severityByModule.get(node.id);
          const pulse = sev === "critical";
          const score =
            node.id === "marketing"
              ? health
              : node.id === "differentiation"
                ? hasDifferentiation
                  ? 85
                  : 40
                : health;
          const ring =
            sev === "critical"
              ? "ring-2 ring-destructive animate-pulse"
              : sev === "warning"
                ? "ring-2 ring-amber-500"
                : "ring-1 ring-border";

          return (
            <div key={node.id} className="flex flex-1 items-center min-w-0">
              <button
                type="button"
                onClick={() => navigate(node.route)}
                className={cn(
                  "flex-1 rounded-lg bg-muted/40 px-2 py-3 text-center transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  ring,
                )}
              >
                <div className="text-xs font-bold text-foreground truncate" dir="auto">
                  {node.label[language]}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{pulse ? "!" : `${Math.round(score)}`}</div>
              </button>
              {i < NODES.length - 1 && (
                <div className="hidden sm:block w-4 h-px bg-border shrink-0 self-center" aria-hidden />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StrategyMap;
