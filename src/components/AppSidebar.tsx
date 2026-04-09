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
import { LayoutDashboard, Database, Map, Bot, BarChart3, FileText, UserCircle } from "lucide-react";

const AppSidebar = () => {
  const { t, isRTL } = useLanguage();
  const { pathname } = useLocation();
  const side = isRTL ? "right" : "left";

  const nav = (to: string, end = false) => pathname === to || (!end && pathname.startsWith(to + "/"));

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
        <SidebarGroup>
          <SidebarGroupLabel>{t("navWorkspace")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={nav("/", true)} tooltip={t("navCommandCenter")}>
                  <NavLink to="/" end>
                    <LayoutDashboard />
                    <span>{t("navCommandCenter")}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={nav("/data")} tooltip={t("navDataSources")}>
                  <NavLink to="/data">
                    <Database />
                    <span>{t("navDataSources")}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={nav("/strategy")} tooltip={t("navStrategyCanvas")}>
                  <NavLink to="/strategy">
                    <Map />
                    <span>{t("navStrategyCanvas")}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={nav("/ai")} tooltip={t("navAiCoach")}>
                  <NavLink to="/ai">
                    <Bot />
                    <span>{t("navAiCoach")}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={nav("/dashboard")} tooltip={t("navDashboard")}>
                  <NavLink to="/dashboard">
                    <BarChart3 />
                    <span>{t("navDashboard")}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={nav("/plans")} tooltip={t("navSavedPlans")}>
                  <NavLink to="/plans">
                    <FileText />
                    <span>{t("navSavedPlans")}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>{t("navModules")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={nav("/differentiate")} tooltip={t("navDifferentiate")}>
                  <NavLink to="/differentiate">
                    <span className="font-mono text-xs w-4 text-center">1</span>
                    <span>{t("navDifferentiate")}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={nav("/wizard")} tooltip={t("navWizard")}>
                  <NavLink to="/wizard">
                    <span className="font-mono text-xs w-4 text-center">2</span>
                    <span>{t("navWizard")}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={nav("/sales")} tooltip={t("navSales")}>
                  <NavLink to="/sales">
                    <span className="font-mono text-xs w-4 text-center">3</span>
                    <span>{t("navSales")}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={nav("/pricing")} tooltip={t("navPricing")}>
                  <NavLink to="/pricing">
                    <span className="font-mono text-xs w-4 text-center">4</span>
                    <span>{t("navPricing")}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={nav("/retention")} tooltip={t("navRetention")}>
                  <NavLink to="/retention">
                    <span className="font-mono text-xs w-4 text-center">5</span>
                    <span>{t("navRetention")}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={nav("/profile")} tooltip={t("navProfile")}>
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
