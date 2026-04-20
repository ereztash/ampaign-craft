import { useMemo, useState, lazy, Suspense } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Database, Map, Bot, BarChart3, FileText, UserCircle, Users, Info, Brain, Sparkles, TrendingUp, Activity } from "lucide-react";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { reorderNavItems } from "@/lib/archetypeUIConfig";
import type { NavItemId } from "@/types/archetype";
import { tx } from "@/i18n/tx";
import { HIDE_INCOMPLETE } from "@/lib/validateEnv";
import { isAdminRole } from "@/lib/roles";

const AdminArchetypeDebugPanel = lazy(() => import("@/components/AdminArchetypeDebugPanel"));

// ═══════════════════════════════════════════════
// NAV ITEM DEFINITIONS
// ═══════════════════════════════════════════════

interface NavItem {
  id: NavItemId;
  to: string;
  labelKey: string;
  icon: React.ReactNode;
  end?: boolean;
}

const WORKSPACE_ITEMS: NavItem[] = [
  { id: "command",   to: "/",          labelKey: "navCommandCenter",  icon: <LayoutDashboard />, end: true },
  { id: "data",      to: "/data",      labelKey: "navDataSources",    icon: <Database /> },
  { id: "strategy",  to: "/strategy",  labelKey: "navStrategyCanvas", icon: <Map /> },
  { id: "ai",        to: "/ai",        labelKey: "navAiCoach",        icon: <Bot /> },
  { id: "dashboard", to: "/dashboard", labelKey: "navDashboard",      icon: <BarChart3 /> },
  { id: "plans",     to: "/plans",     labelKey: "navSavedPlans",     icon: <FileText /> },
  { id: "crm",       to: "/crm",       labelKey: "CRM",               icon: <Users /> },
];

const MODULE_ITEMS: NavItem[] = [
  { id: "differentiate", to: "/differentiate", labelKey: "navDifferentiate", icon: <span className="font-mono text-xs w-4 text-center">1</span> },
  { id: "wizard",        to: "/wizard",        labelKey: "navWizard",        icon: <span className="font-mono text-xs w-4 text-center">2</span> },
  { id: "sales",         to: "/sales",         labelKey: "navSales",         icon: <span className="font-mono text-xs w-4 text-center">3</span> },
  { id: "pricing",       to: "/pricing",       labelKey: "navPricing",       icon: <span className="font-mono text-xs w-4 text-center">4</span> },
  { id: "retention",     to: "/retention",     labelKey: "navRetention",     icon: <span className="font-mono text-xs w-4 text-center">5</span> },
];

// ═══════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════

const AppSidebar = () => {
  const { t, isRTL, language } = useLanguage();
  const { pathname } = useLocation();
  const { uiConfig, confidenceTier, adaptationsEnabled, setAdaptationsEnabled } = useArchetype();
  const { user } = useAuth();
  const side = isRTL ? "right" : "left";
  const isHe = isRTL;

  const isOwner = isAdminRole(user?.role);
  const [debugOpen, setDebugOpen] = useState(false);

  const isActive = (to: string, end = false) =>
    pathname === to || (!end && pathname.startsWith(to + "/"));

  // Workspace reordering: "strong" only (full morphing — more disorienting)
  const orderedWorkspace = useMemo<NavItem[]>(() => {
    if (confidenceTier !== "strong") return WORKSPACE_ITEMS;
    const ids = reorderNavItems(
      WORKSPACE_ITEMS.map((i) => i.id),
      uiConfig.workspaceOrder,
    );
    const map = new globalThis.Map<NavItemId, NavItem>(WORKSPACE_ITEMS.map((i) => [i.id, i] as [NavItemId, NavItem]));
    return ids.map((id) => map.get(id)!).filter(Boolean);
  }, [uiConfig.workspaceOrder, confidenceTier]);

  // Module reordering: "confident" and "strong" — lower friction since modules
  // are already numbered and users expect their order to reflect priority (H5)
  const modulesReordered = confidenceTier === "confident" || confidenceTier === "strong";
  const orderedModules = useMemo<NavItem[]>(() => {
    if (!modulesReordered) return MODULE_ITEMS;
    const ids = reorderNavItems(
      MODULE_ITEMS.map((i) => i.id),
      uiConfig.modulesOrder,
    );
    const map = new globalThis.Map<NavItemId, NavItem>(MODULE_ITEMS.map((i) => [i.id, i] as [NavItemId, NavItem]));
    // Re-number icons after reordering
    return ids.map((id, idx) => {
      const item = map.get(id);
      if (!item) return null;
      return {
        ...item,
        icon: <span className="font-mono text-xs w-4 text-center">{idx + 1}</span>,
      };
    }).filter(Boolean) as NavItem[];
  }, [uiConfig.modulesOrder, modulesReordered]);

  return (
    <>
      <Sidebar side={side} collapsible="icon" variant="sidebar" className="border-e border-sidebar-border" role="navigation" aria-label={isHe ? "ניווט ראשי" : "Main navigation"}>
        <SidebarHeader className="border-b border-sidebar-border">
          <NavLink to="/" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg funnel-gradient shrink-0">
              <span className="text-sm font-bold text-accent-foreground">F</span>
            </div>
            <span className="font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden truncate">{t("appName")}</span>
          </NavLink>
        </SidebarHeader>

        <SidebarContent>
          {/* Workspace group */}
          <SidebarGroup>
            <SidebarGroupLabel>{t("navWorkspace")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {orderedWorkspace.map((item) => {
                  const isComingSoon = HIDE_INCOMPLETE && item.id === "crm";
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.to, item.end)}
                        tooltip={t(item.labelKey as Parameters<typeof t>[0])}
                      >
                        <NavLink to={item.to} end={item.end}>
                          {item.icon}
                          <span>{t(item.labelKey as Parameters<typeof t>[0])}</span>
                          {isComingSoon && (
                            <span className="ml-auto text-[10px] font-medium text-muted-foreground border border-muted-foreground/30 rounded px-1">
                              {tx({ he: "בקרוב", en: "Soon" }, language)}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Modules group */}
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1">
              {t("navModules")}
              {modulesReordered && (
                <span
                  className="inline-flex"
                  title={
                    isRTL
                      ? `מסודר עבור ${uiConfig.label.he}: ${uiConfig.adaptationDescription.he}`
                      : `Ordered for ${uiConfig.label.en}: ${uiConfig.adaptationDescription.en}`
                  }
                >
                  <Info
                    className="h-3 w-3 text-muted-foreground/60 shrink-0"
                    aria-hidden="true"
                  />
                </span>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {orderedModules.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.to)}
                      tooltip={t(item.labelKey as Parameters<typeof t>[0])}
                    >
                      <NavLink to={item.to}>
                        {item.icon}
                        <span>{t(item.labelKey as Parameters<typeof t>[0])}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Admin group — owner / admin only */}
          {isOwner && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel className="text-amber-600 dark:text-amber-400">
                  {isHe ? "ניהול" : "Admin"}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip={isHe ? "דשבורד AARRR" : "AARRR Dashboard"}
                        isActive={isActive("/admin/aarrr", true)}
                      >
                        <NavLink to="/admin/aarrr">
                          <TrendingUp className="text-amber-600 dark:text-amber-400" />
                          <span>{isHe ? "דשבורד AARRR" : "AARRR Dashboard"}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip={isHe ? "ניטור סוכנים" : "Agent Monitor"}
                        isActive={isActive("/admin/agents", true)}
                      >
                        <NavLink to="/admin/agents">
                          <Activity className="text-amber-600 dark:text-amber-400" />
                          <span>{isHe ? "ניטור סוכנים" : "Agent Monitor"}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setDebugOpen(true)}
                        tooltip={isHe ? "פאנל ארכיטיפ" : "Archetype debug panel"}
                        className="cursor-pointer"
                      >
                        <Brain className="text-amber-600 dark:text-amber-400" />
                        <span>{isHe ? "פאנל ארכיטיפ" : "Archetype Panel"}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            {/* Personalisation toggle — shown at confident/strong tier */}
            {(confidenceTier === "confident" || confidenceTier === "strong") && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/archetype")}
                    tooltip={tx({ he: "הארכיטיפ שלי", en: "My Archetype" }, language)}
                  >
                    <NavLink to="/archetype">
                      {adaptationsEnabled
                        ? <Sparkles className="text-primary" />
                        : <Sparkles className="text-muted-foreground opacity-50" />}
                      <span>
                        {adaptationsEnabled
                          ? tx({ he: "התאמות פעילות", en: "Adaptations on" }, language)
                          : tx({ he: "התאם סביבה", en: "Personalise workspace" }, language)}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setAdaptationsEnabled(!adaptationsEnabled)}
                    tooltip={adaptationsEnabled
                      ? tx({ he: "כבה התאמות", en: "Disable adaptations" }, language)
                      : tx({ he: "הפעל התאמות", en: "Enable adaptations" }, language)}
                    aria-pressed={adaptationsEnabled}
                    className="cursor-pointer"
                  >
                    {adaptationsEnabled
                      ? <Sparkles className="h-4 w-4 text-muted-foreground opacity-50" aria-hidden="true" />
                      : <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />}
                    <span className="text-muted-foreground text-xs">
                      {adaptationsEnabled
                        ? tx({ he: "כבה", en: "Turn off" }, language)
                        : tx({ he: "הפעל", en: "Turn on" }, language)}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/profile")} tooltip={t("navProfile")}>
                <NavLink to="/profile">
                  <UserCircle />
                  <span>{t("navProfile")}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* Admin panel — rendered outside Sidebar to escape stacking context */}
      {isOwner && (
        <Suspense fallback={null}>
          <AdminArchetypeDebugPanel open={debugOpen} onOpenChange={setDebugOpen} />
        </Suspense>
      )}
    </>
  );
};

export default AppSidebar;
