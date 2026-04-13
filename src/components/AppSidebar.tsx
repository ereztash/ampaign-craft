import { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
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
import { LayoutDashboard, Database, Map, Bot, BarChart3, FileText, UserCircle, Users } from "lucide-react";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { reorderNavItems } from "@/lib/archetypeUIConfig";
import type { NavItemId } from "@/types/archetype";

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
  const { t, isRTL } = useLanguage();
  const { pathname } = useLocation();
  const { uiConfig, confidenceTier } = useArchetype();
  const side = isRTL ? "right" : "left";

  const isActive = (to: string, end = false) =>
    pathname === to || (!end && pathname.startsWith(to + "/"));

  // Reorder workspace and module items when confidence is "strong"
  const orderedWorkspace = useMemo<NavItem[]>(() => {
    if (confidenceTier !== "strong") return WORKSPACE_ITEMS;
    const ids = reorderNavItems(
      WORKSPACE_ITEMS.map((i) => i.id),
      uiConfig.workspaceOrder,
    );
    const map = new Map(WORKSPACE_ITEMS.map((i) => [i.id, i]));
    return ids.map((id) => map.get(id)!).filter(Boolean);
  }, [uiConfig.workspaceOrder, confidenceTier]);

  const orderedModules = useMemo<NavItem[]>(() => {
    if (confidenceTier !== "strong") return MODULE_ITEMS;
    const ids = reorderNavItems(
      MODULE_ITEMS.map((i) => i.id),
      uiConfig.modulesOrder,
    );
    const map = new Map(MODULE_ITEMS.map((i) => [i.id, i]));
    // Re-number icons after reordering
    return ids.map((id, idx) => {
      const item = map.get(id);
      if (!item) return null;
      return {
        ...item,
        icon: <span className="font-mono text-xs w-4 text-center">{idx + 1}</span>,
      };
    }).filter(Boolean) as NavItem[];
  }, [uiConfig.modulesOrder, confidenceTier]);

  return (
    <Sidebar side={side} collapsible="icon" variant="sidebar" className="border-e border-sidebar-border">
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
              {orderedWorkspace.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.to, item.end)}
                    tooltip={t(item.labelKey)}
                  >
                    <NavLink to={item.to} end={item.end}>
                      {item.icon}
                      <span>{t(item.labelKey)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Modules group */}
        <SidebarGroup>
          <SidebarGroupLabel>{t("navModules")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {orderedModules.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.to)}
                    tooltip={t(item.labelKey)}
                  >
                    <NavLink to={item.to}>
                      {item.icon}
                      <span>{t(item.labelKey)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
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
  );
};

export default AppSidebar;
