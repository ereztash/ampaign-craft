import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/hooks/useDarkMode";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Database,
  Map,
  Bot,
  FolderOpen,
  UserCircle,
  Globe,
  Sun,
  Moon,
  LogIn,
  LogOut,
  Crosshair,
  Rocket,
} from "lucide-react";

interface NavItem {
  id: string;
  label: { he: string; en: string };
  icon: React.ElementType;
  path: string;
  badge?: { he: string; en: string };
}

const MAIN_NAV: NavItem[] = [
  {
    id: "command-center",
    label: { he: "מרכז בקרה", en: "Command Center" },
    icon: LayoutDashboard,
    path: "/",
  },
  {
    id: "data-hub",
    label: { he: "מקורות מידע", en: "Data Sources" },
    icon: Database,
    path: "/data",
  },
  {
    id: "strategy",
    label: { he: "קנבס אסטרטגי", en: "Strategy Canvas" },
    icon: Map,
    path: "/strategy",
  },
  {
    id: "ai-coach",
    label: { he: "AI Coach", en: "AI Coach" },
    icon: Bot,
    path: "/ai",
  },
];

const SECONDARY_NAV: NavItem[] = [
  {
    id: "plans",
    label: { he: "תוכניות שמורות", en: "Saved Plans" },
    icon: FolderOpen,
    path: "/plans",
  },
  {
    id: "differentiate",
    label: { he: "סוכן בידול", en: "Differentiation" },
    icon: Crosshair,
    path: "/differentiate",
  },
  {
    id: "wizard",
    label: { he: "תוכנית חדשה", en: "New Plan" },
    icon: Rocket,
    path: "/wizard",
  },
];

const AppSidebar = () => {
  const { language, setLanguage } = useLanguage();
  const isHe = language === "he";
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          onClick={() => navigate(item.path)}
          isActive={active}
          tooltip={item.label[language]}
        >
          <Icon className="h-4 w-4" />
          <span>{item.label[language]}</span>
          {item.badge && (
            <Badge variant="secondary" className="ms-auto text-xs h-5 px-1.5">
              {item.badge[language]}
            </Badge>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar side={isHe ? "right" : "left"} collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => navigate("/")}
              className="data-[state=open]:bg-sidebar-accent"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg funnel-gradient">
                <span className="text-sm font-bold text-accent-foreground">F</span>
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">FunnelForge</span>
                <span className="text-xs text-muted-foreground">
                  {isHe ? "מרכז צמיחה" : "Growth Center"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isHe ? "ראשי" : "Main"}</SidebarGroupLabel>
          <SidebarMenu>
            {MAIN_NAV.map(renderNavItem)}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>{isHe ? "כלים" : "Tools"}</SidebarGroupLabel>
          <SidebarMenu>
            {SECONDARY_NAV.map(renderNavItem)}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {/* Language toggle */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setLanguage(isHe ? "en" : "he")}
              tooltip={isHe ? "English" : "עברית"}
            >
              <Globe className="h-4 w-4" />
              <span>{isHe ? "English" : "עברית"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Dark mode toggle */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleDarkMode}
              tooltip={isDark ? (isHe ? "מצב בהיר" : "Light Mode") : (isHe ? "מצב כהה" : "Dark Mode")}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{isDark ? (isHe ? "מצב בהיר" : "Light Mode") : (isHe ? "מצב כהה" : "Dark Mode")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarSeparator />

          {/* User / Auth */}
          {user ? (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/profile")}
                  tooltip={isHe ? "פרופיל" : "Profile"}
                >
                  <UserCircle className="h-4 w-4" />
                  <span>{user.displayName || user.email}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => signOut()}
                  tooltip={isHe ? "התנתק" : "Sign Out"}
                >
                  <LogOut className="h-4 w-4" />
                  <span>{isHe ? "התנתק" : "Sign Out"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate("/profile")}
                tooltip={isHe ? "התחבר" : "Sign In"}
              >
                <LogIn className="h-4 w-4" />
                <span>{isHe ? "התחבר" : "Sign In"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
