import { useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { BottleneckAnalysis, BottleneckModule } from "@/engine/bottleneckEngine";
import { Badge } from "@/components/ui/badge";
import { Crosshair, BarChart3, TrendingUp, DollarSign, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface StrategyMapProps {
  analysis: BottleneckAnalysis;
  activeNode: BottleneckModule | null;
  onNodeClick: (module: BottleneckModule) => void;
}

interface ModuleNode {
  id: BottleneckModule;
  label: { he: string; en: string };
  icon: React.ElementType;
  color: string;
}

const MODULES: ModuleNode[] = [
  { id: "differentiation", label: { he: "בידול", en: "Differentiation" }, icon: Crosshair, color: "text-amber-500" },
  { id: "marketing", label: { he: "שיווק", en: "Marketing" }, icon: BarChart3, color: "text-primary" },
  { id: "sales", label: { he: "מכירות", en: "Sales" }, icon: TrendingUp, color: "text-accent" },
  { id: "pricing", label: { he: "תמחור", en: "Pricing" }, icon: DollarSign, color: "text-emerald-500" },
  { id: "retention", label: { he: "שימור", en: "Retention" }, icon: Heart, color: "text-pink-500" },
];

const STATUS_COLORS = {
  healthy: { ring: "ring-accent/50", bg: "bg-accent/10", dot: "bg-accent" },
  warning: { ring: "ring-amber-500/50", bg: "bg-amber-500/10", dot: "bg-amber-500" },
  critical: { ring: "ring-destructive/50", bg: "bg-destructive/10", dot: "bg-destructive" },
};

const StrategyMap = ({ analysis, activeNode, onNodeClick }: StrategyMapProps) => {
  const { language, isRTL } = useLanguage();
  const reducedMotion = useReducedMotion();

  const nodesWithHealth = useMemo(() =>
    MODULES.map((mod) => ({
      ...mod,
      health: analysis.moduleHealth[mod.id],
      bottleneckCount: analysis.bottlenecks.filter((b) => b.module === mod.id).length,
    })),
    [analysis]
  );

  return (
    <div className="relative">
      {/* Desktop: horizontal flow */}
      <div className="hidden sm:flex items-center justify-between gap-2 px-4">
        {nodesWithHealth.map((node, i) => {
          const Icon = node.icon;
          const status = node.health.status;
          const colors = STATUS_COLORS[status];
          const isActive = activeNode === node.id;

          return (
            <div key={node.id} className="flex items-center gap-2 flex-1">
              <motion.button
                whileHover={reducedMotion ? {} : { scale: 1.05 }}
                whileTap={reducedMotion ? {} : { scale: 0.95 }}
                onClick={() => onNodeClick(node.id)}
                className={cn(
                  "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all w-full",
                  "hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer",
                  isActive ? "border-primary shadow-lg bg-primary/5" : `border-border ${colors.bg}`,
                  status === "critical" && !isActive && "animate-pulse",
                )}
              >
                {/* Health dot */}
                <div className={cn("absolute top-2 end-2 h-2.5 w-2.5 rounded-full", colors.dot)} />

                {/* Bottleneck count badge */}
                {node.bottleneckCount > 0 && (
                  <Badge className="absolute -top-2 -start-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive text-destructive-foreground">
                    {node.bottleneckCount}
                  </Badge>
                )}

                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", colors.bg)}>
                  <Icon className={cn("h-6 w-6", node.color)} />
                </div>

                <span className="text-xs font-semibold text-foreground text-center" dir="auto">
                  {node.label[language]}
                </span>

                <span className={cn("text-xs font-bold", node.health.score >= 70 ? "text-accent" : node.health.score >= 40 ? "text-amber-500" : "text-destructive")}>
                  {node.health.score}/100
                </span>
              </motion.button>

              {/* Connector arrow */}
              {i < nodesWithHealth.length - 1 && (
                <div className="flex-shrink-0 px-1">
                  <svg width="24" height="24" viewBox="0 0 24 24" className={cn("text-muted-foreground", isRTL && "rotate-180")}>
                    <path d="M5 12h14m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical flow */}
      <div className="sm:hidden space-y-2 px-2">
        {nodesWithHealth.map((node, i) => {
          const Icon = node.icon;
          const status = node.health.status;
          const colors = STATUS_COLORS[status];
          const isActive = activeNode === node.id;

          return (
            <div key={node.id}>
              <button
                onClick={() => onNodeClick(node.id)}
                className={cn(
                  "relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all w-full text-start",
                  "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary",
                  isActive ? "border-primary shadow-md bg-primary/5" : `border-border ${colors.bg}`,
                )}
              >
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", colors.bg)}>
                  <Icon className={cn("h-5 w-5", node.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground" dir="auto">{node.label[language]}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
                    <span className="text-xs text-muted-foreground">
                      {node.health.score}/100
                    </span>
                    {node.bottleneckCount > 0 && (
                      <Badge className="text-xs h-4 px-1 bg-destructive text-destructive-foreground">
                        {node.bottleneckCount}
                      </Badge>
                    )}
                  </div>
                </div>
                <span className="text-muted-foreground">→</span>
              </button>

              {i < nodesWithHealth.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <div className="h-3 w-0.5 bg-border" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StrategyMap;
