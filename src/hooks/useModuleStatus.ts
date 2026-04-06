// Module status tracking — reads from existing localStorage keys
import { useMemo } from "react";

export interface ModuleStatus {
  id: string;
  label: { he: string; en: string };
  completed: boolean;
  route: string;
  icon: string;
  color: string;
}

export function useModuleStatus(): ModuleStatus[] {
  return useMemo(() => {
    const hasDiff = !!localStorage.getItem("funnelforge-differentiation-result");
    const plans = (() => { try { return JSON.parse(localStorage.getItem("funnelforge-plans") || "[]"); } catch { return []; } })();
    const hasPlan = plans.length > 0;

    return [
      { id: "differentiation", label: { he: "בידול", en: "Differentiation" }, completed: hasDiff, route: "/differentiate", icon: "Crosshair", color: "text-amber-500" },
      { id: "marketing", label: { he: "שיווק", en: "Marketing" }, completed: hasPlan, route: "/wizard", icon: "BarChart3", color: "text-primary" },
      { id: "sales", label: { he: "מכירות", en: "Sales" }, completed: hasPlan, route: "/sales", icon: "TrendingUp", color: "text-accent" },
      { id: "pricing", label: { he: "תמחור", en: "Pricing" }, completed: hasPlan, route: "/pricing", icon: "DollarSign", color: "text-emerald-500" },
      { id: "retention", label: { he: "שימור", en: "Retention" }, completed: hasPlan, route: "/retention", icon: "Heart", color: "text-pink-500" },
    ];
  }, []);
}
