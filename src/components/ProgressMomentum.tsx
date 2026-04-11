import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Flame, ChevronRight } from "lucide-react";

interface ModuleInfo {
  id: string;
  label: { he: string; en: string };
  completed: boolean;
  route: string;
}

interface ProgressMomentumProps {
  modules: ModuleInfo[];
  streakWeeks: number;
  investmentMinutes: number;
  plansCreated: number;
}

export function ProgressMomentum({ modules, streakWeeks, investmentMinutes, plansCreated }: ProgressMomentumProps) {
  const { language } = useLanguage();
  const reducedMotion = useReducedMotion();
  const isHe = language === "he";
  const navigate = useNavigate();

  const completed = modules.filter((m) => m.completed).length;
  const total = modules.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Endowed progress: visual bar starts at 10% to trigger goal gradient
  const visualPct = total > 0 ? Math.max(10, pct) : 0;

  // Next incomplete module for Zeigarnik tension
  const nextModule = modules.find((m) => !m.completed);

  const hours = Math.max(1, Math.round(investmentMinutes / 60));

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-3">
        {/* Progress header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {isHe ? "התקדמות" : "Progress"}
          </h3>
          {streakWeeks > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <Flame className="h-3.5 w-3.5" />
              {streakWeeks} {isHe ? "שבועות רצופים" : "week streak"}
            </div>
          )}
        </div>

        {/* Goal-gradient progress bar with acceleration */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completed}/{total} {isHe ? "מודולים" : "modules"}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
              initial={reducedMotion ? false : { width: "10%" }}
              animate={{ width: `${visualPct}%` }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Investment IKEA meter */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {plansCreated > 0 && (
            <span>📋 {plansCreated} {isHe ? "אסטרטגיות" : "strategies"}</span>
          )}
          <span>⏱️ {hours} {isHe ? "שעות השקעה" : "hours invested"}</span>
        </div>

        {/* Zeigarnik tension — next incomplete module */}
        {nextModule && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-xs text-primary hover:text-primary"
            onClick={() => navigate(nextModule.route)}
          >
            <span dir="auto">
              {isHe
                ? `המשך: ${nextModule.label.he}`
                : `Continue: ${nextModule.label.en}`}
            </span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
