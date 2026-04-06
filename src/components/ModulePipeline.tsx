import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useModuleStatus, ModuleStatus } from "@/hooks/useModuleStatus";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crosshair, BarChart3, TrendingUp, DollarSign, Heart, Check, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const ICONS: Record<string, React.ElementType> = {
  Crosshair, BarChart3, TrendingUp, DollarSign, Heart,
};

const FLOW_LABELS: { from: string; to: string; label: { he: string; en: string } }[] = [
  { from: "differentiation", to: "marketing", label: { he: "הבידול מזין את ה-hooks והקופי", en: "Differentiation feeds hooks & copy" } },
  { from: "marketing", to: "sales", label: { he: "שלבי המשפך מזינים סקריפטי מכירה", en: "Funnel stages power sales scripts" } },
  { from: "marketing", to: "pricing", label: { he: "נתוני קהל מעצבים את ה-tiers", en: "Audience data shapes pricing tiers" } },
  { from: "pricing", to: "retention", label: { he: "תמחור ומכירות מזינים שימור", en: "Pricing & sales inform retention" } },
];

const MODULE_DESCRIPTIONS: Record<string, { he: string; en: string }> = {
  differentiation: { he: "גלה מה באמת מבדל אותך — מנגנונים, לא תיאורים", en: "Discover what truly sets you apart — mechanisms, not adjectives" },
  marketing: { he: "משפך 5 שלבים + ערוצים + תקציב + hooks מותאמים", en: "5-stage funnel + channels + budget + personalized hooks" },
  sales: { he: "סקריפטים, התנגדויות, neuro-closing — מוכנים להעתקה", en: "Scripts, objections, neuro-closing — ready to copy" },
  pricing: { he: "מבנה tiers, offer stack, אחריות, מסגור מחיר", en: "Tier structure, offer stack, guarantee, price framing" },
  retention: { he: "Onboarding, churn prevention, referral, loyalty", en: "Onboarding, churn prevention, referral, loyalty" },
};

interface ModulePipelineProps {
  showLabels?: boolean;
}

const ModulePipeline = ({ showLabels = true }: ModulePipelineProps) => {
  const { language, isRTL } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();
  const modules = useModuleStatus();
  const reducedMotion = useReducedMotion();

  const renderNode = (mod: ModuleStatus, index: number) => {
    const Icon = ICONS[mod.icon] || Crosshair;
    return (
      <motion.div
        key={mod.id}
        {...(reducedMotion ? {} : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: index * 0.1 } })}
      >
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg hover:translate-y-[-2px] border-2 ${
            mod.completed ? "border-accent/40 bg-accent/5" : "border-border hover:border-primary/50"
          }`}
          onClick={() => navigate(mod.route)}
        >
          <CardContent className="p-4 text-center relative">
            {mod.completed && (
              <div className="absolute top-2 end-2">
                <Check className="h-4 w-4 text-accent" />
              </div>
            )}
            <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl ${mod.completed ? "bg-accent/20" : "bg-muted"}`}>
              <Icon className={`h-6 w-6 ${mod.color}`} />
            </div>
            <h3 className="font-bold text-sm text-foreground">{mod.label[language]}</h3>
            {showLabels && (
              <p className="text-xs text-muted-foreground mt-1" dir="auto">
                {MODULE_DESCRIPTIONS[mod.id]?.[language] || ""}
              </p>
            )}
            <Badge variant={mod.completed ? "default" : "outline"} className="text-xs mt-2">
              {mod.completed ? (isHe ? "הושלם" : "Complete") : (isHe ? "התחל" : "Start")}
            </Badge>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Flow: row 1 = diff → marketing → sales, row 2 = pricing → retention
  return (
    <div className="space-y-6">
      {/* Row 1: Differentiation → Marketing → Sales */}
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${isRTL ? "sm:direction-rtl" : ""}`}>
        {modules.slice(0, 3).map((mod, i) => (
          <div key={mod.id} className="flex items-center gap-2">
            <div className="flex-1">{renderNode(mod, i)}</div>
            {i < 2 && (
              <ArrowLeft className={`h-4 w-4 text-muted-foreground hidden sm:block shrink-0 ${isRTL ? "" : "rotate-180"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Flow labels */}
      {showLabels && (
        <div className="flex justify-center gap-6 text-xs text-muted-foreground flex-wrap">
          {FLOW_LABELS.slice(0, 2).map((flow, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="font-medium">{modules.find((m) => m.id === flow.from)?.label[language]}</span>
              <span>→</span>
              <span>{flow.label[language]}</span>
            </span>
          ))}
        </div>
      )}

      {/* Row 2: Pricing → Retention */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto ${isRTL ? "sm:direction-rtl" : ""}`}>
        {modules.slice(3).map((mod, i) => (
          <div key={mod.id} className="flex items-center gap-2">
            <div className="flex-1">{renderNode(mod, i + 3)}</div>
            {i === 0 && (
              <ArrowLeft className={`h-4 w-4 text-muted-foreground hidden sm:block shrink-0 ${isRTL ? "" : "rotate-180"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModulePipeline;
