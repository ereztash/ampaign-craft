import { NavLink } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { LayoutDashboard, Database, Map, Bot, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const MobileTabBar = () => {
  const { t, isRTL } = useLanguage();

  const items: { to: string; end?: boolean; icon: typeof LayoutDashboard; label: string }[] = [
    { to: "/", end: true, icon: LayoutDashboard, label: t("navCommandCenter") },
    { to: "/data", icon: Database, label: t("navDataSources") },
    { to: "/strategy", icon: Map, label: t("navStrategyCanvas") },
    { to: "/ai", icon: Bot, label: t("navAiCoach") },
    { to: "/plans", icon: FileText, label: t("navSavedPlans") },
  ];

  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 z-50 flex h-16 items-stretch border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden",
        "pb-[env(safe-area-inset-bottom)]",
      )}
      aria-label={t("navMobileLabel")}
    >
      <ul className={`flex flex-1 ${isRTL ? "flex-row-reverse" : ""}`}>
        {items.map(({ to, end, icon: Icon, label }) => (
          <li key={to} className="flex-1 min-w-0">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium text-muted-foreground",
                  isActive && "text-primary",
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="truncate w-full text-center leading-tight">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default MobileTabBar;
