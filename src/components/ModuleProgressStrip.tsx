import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useModuleStatus } from "@/hooks/useModuleStatus";
import { Check, Crosshair, BarChart3, TrendingUp, DollarSign, Heart } from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Crosshair, BarChart3, TrendingUp, DollarSign, Heart,
};

const ROUTE_TO_MODULE: Record<string, string> = {
  "/differentiate": "differentiation",
  "/wizard": "marketing",
  "/sales": "sales",
  "/pricing": "pricing",
  "/retention": "retention",
  "/dashboard": "marketing",
};

const ModuleProgressStrip = () => {
  const { language, isRTL } = useLanguage();
  const modules = useModuleStatus();
  const navigate = useNavigate();
  const location = useLocation();

  const currentModuleId = ROUTE_TO_MODULE[location.pathname];

  // Only show inside module pages (not on hub/plans/profile)
  if (!currentModuleId) return null;

  return (
    <div className="bg-muted/50 border-b border-border">
      <div className="container mx-auto px-4">
        <div className={`flex items-center justify-center gap-1 sm:gap-2 h-9 ${isRTL ? "flex-row-reverse" : ""}`}>
          {modules.map((mod, i) => {
            const Icon = ICON_MAP[mod.icon];
            const isCurrent = mod.id === currentModuleId;
            const isCompleted = mod.completed;

            return (
              <div key={mod.id} className={`flex items-center ${isRTL ? "flex-row-reverse" : ""}`}>
                <button
                  onClick={() => navigate(mod.route)}
                  title={mod.label[language]}
                  aria-label={`${mod.label[language]} ${isCompleted ? "✓" : ""}`}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                    isCurrent
                      ? "bg-primary/10 text-primary"
                      : isCompleted
                        ? "text-accent hover:bg-accent/10"
                        : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : Icon ? (
                    <Icon className="h-3.5 w-3.5" />
                  ) : null}
                  <span className="hidden sm:inline">{mod.label[language]}</span>
                </button>
                {i < modules.length - 1 && (
                  <div className="h-px w-3 sm:w-5 bg-border mx-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModuleProgressStrip;
