import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { FormData, BusinessField, MainGoal } from "@/types/funnel";
import { getSmartDefaults } from "@/lib/smartDefaults";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  ShoppingBag, Monitor, UtensilsCrossed, Briefcase,
  GraduationCap, Heart, Building, Plane, User, MoreHorizontal,
  Megaphone, UserPlus, ShoppingCart, Award, Zap,
} from "lucide-react";

interface ExpressWizardProps {
  onComplete: (data: FormData) => void;
}

const FIELDS = [
  { key: "fashion" as const, icon: ShoppingBag },
  { key: "tech" as const, icon: Monitor },
  { key: "food" as const, icon: UtensilsCrossed },
  { key: "services" as const, icon: Briefcase },
  { key: "education" as const, icon: GraduationCap },
  { key: "health" as const, icon: Heart },
  { key: "realEstate" as const, icon: Building },
  { key: "tourism" as const, icon: Plane },
  { key: "personalBrand" as const, icon: User },
  { key: "other" as const, icon: MoreHorizontal },
] as const;

const GOALS = [
  { key: "awareness" as const, icon: Megaphone },
  { key: "leads" as const, icon: UserPlus },
  { key: "sales" as const, icon: ShoppingCart },
  { key: "loyalty" as const, icon: Award },
] as const;

const ExpressWizard = ({ onComplete }: ExpressWizardProps) => {
  const { t, isRTL } = useLanguage();
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const [field, setField] = useState<BusinessField | "">("");
  const [goal, setGoal] = useState<MainGoal | "">("");

  const fieldLabels: Record<string, string> = {
    fashion: t("fieldFashion"), tech: t("fieldTech"), food: t("fieldFood"),
    services: t("fieldServices"), education: t("fieldEducation"), health: t("fieldHealth"),
    realEstate: t("fieldRealEstate"), tourism: t("fieldTourism"), personalBrand: t("fieldPersonalBrand"), other: t("fieldOther"),
  };
  const goalLabels: Record<string, string> = {
    awareness: t("goalAwareness"), leads: t("goalLeads"), sales: t("goalSales"), loyalty: t("goalLoyalty"),
  };

  const canGenerate = field !== "" && goal !== "";

  const handleGenerate = () => {
    if (!canGenerate) return;
    const formData = getSmartDefaults(field as BusinessField, goal as MainGoal);
    onComplete(formData);
  };

  return (
    <div className="container mx-auto px-4 pt-8 pb-16 max-w-2xl" dir={isRTL ? "rtl" : "ltr"}>
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.3 }}
      >
        {/* Step 1: Business Field */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-1" dir="auto">
            {isRTL ? "מה התחום שלך?" : "What's your field?"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4" dir="auto">
            {isRTL ? "בחר אחד, השאר ייבחר אוטומטית" : "Pick one. We'll handle the rest"}
          </p>
          <div className={`grid gap-2 ${isMobile ? "grid-cols-2" : "grid-cols-5"}`}>
            {FIELDS.map((f) => {
              const Icon = f.icon;
              const selected = field === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setField(f.key)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all ${
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">{fieldLabels[f.key]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Main Goal */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-1" dir="auto">
            {isRTL ? "מה המטרה העיקרית?" : "What's your main goal?"}
          </h2>
          <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
            {GOALS.map((g) => {
              const Icon = g.icon;
              const selected = goal === g.key;
              return (
                <button
                  key={g.key}
                  onClick={() => setGoal(g.key)}
                  className={`flex items-center gap-2 rounded-xl border-2 p-3 text-start transition-all ${
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">{goalLabels[g.key]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate */}
        <Button
          size="lg"
          disabled={!canGenerate}
          onClick={handleGenerate}
          className="w-full funnel-gradient text-accent-foreground font-semibold"
        >
          <Zap className="h-4 w-4" />
          {isRTL ? "צור תוכנית מיידית" : "Generate Instant Plan"}
        </Button>

        {canGenerate && (
          <p className="text-xs text-muted-foreground text-center mt-3" dir="auto">
            {isRTL
              ? "נבחר אוטומטית: קהל יעד, תקציב, ערוצים ומודל מכירה על בסיס התחום והמטרה"
              : "Auto-selected: audience, budget, channels & sales model based on your field and goal"}
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default ExpressWizard;
