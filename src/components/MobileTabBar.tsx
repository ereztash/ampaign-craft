import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { LayoutDashboard, Database, Map, Bot, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "home", icon: LayoutDashboard, label: { he: "בית", en: "Home" }, path: "/" },
  { id: "data", icon: Database, label: { he: "מידע", en: "Data" }, path: "/data" },
  { id: "strategy", icon: Map, label: { he: "אסטרטגיה", en: "Strategy" }, path: "/strategy" },
  { id: "ai", icon: Bot, label: { he: "AI", en: "AI" }, path: "/ai" },
  { id: "plans", icon: FolderOpen, label: { he: "תוכניות", en: "Plans" }, path: "/plans" },
] as const;

const MobileTabBar = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-14 items-center justify-around">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className="leading-none">{tab.label[language]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileTabBar;
