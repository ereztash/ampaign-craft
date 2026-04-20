import { useState, lazy, Suspense, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import AchievementBadgesPanel from "@/components/AchievementBadgesPanel";
import { NotificationCenter } from "@/components/NotificationCenter";
import { tx } from "@/i18n/tx";
import { Globe, Sun, Moon, LogIn, LogOut, Award, UserCircle, Settings, Home, Brain } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Separator } from "@/components/ui/separator";
import { isAdminRole } from "@/lib/roles";

const AdminArchetypeDebugPanel = lazy(() => import("@/components/AdminArchetypeDebugPanel"));

interface AppTopBarProps {
  title?: string;
}

const AppTopBar = ({ title }: AppTopBarProps) => {
  const { language, setLanguage, t } = useLanguage();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authOpen, setAuthOpen] = useState(false);

  // Auto-open auth modal when redirected from a protected route;
  // once logged in, navigate back to the intended destination.
  useEffect(() => {
    const state = location.state as { openAuth?: boolean; returnTo?: string } | null;
    if (!state?.openAuth) return;
    if (!user) {
      setAuthOpen(true);
    } else if (state.returnTo) {
      navigate(state.returnTo, { replace: true, state: {} });
    }
  }, [location.state, user, navigate]);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const isHe = language === "he";
  const isOwner = isAdminRole(user?.role);

  return (
    <>
      <div
        className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 md:px-4"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <SidebarTrigger className="md:flex" />
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        {title ? (
          <span className="text-sm font-medium text-foreground truncate flex-1" dir="auto">
            {title}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground truncate flex-1 hidden sm:block">
            {t("navCommandCenter")}
          </span>
        )}
        <div className="ms-auto flex items-center gap-1">
          {/* Owner-only: archetype debug panel trigger */}
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-9 px-2 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
              onClick={() => setDebugOpen(true)}
              aria-label={tx({ he: "פאנל ארכיטיפ", en: "Archetype debug panel" }, language)}
              title={tx({ he: "פאנל ניפוי ארכיטיפ (בעלים בלבד)", en: "Archetype debug panel (owner only)" }, language)}
            >
              <Brain className="h-4 w-4" />
              <span className="hidden md:inline text-xs font-medium">Admin</span>
            </Button>
          )}
          <NotificationCenter />
          <Button variant="ghost" size="sm" onClick={() => setLanguage(language === "he" ? "en" : "he")} className="gap-1 h-9 min-w-[44px]" aria-label={tx({ he: "Switch to English", en: "עבור לעברית" }, language)}>
            <Globe className="h-4 w-4" />
            {language === "he" ? "EN" : "עב"}
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0 overflow-hidden" aria-label={tx({ he: "תפריט משתמש", en: "User menu" }, language)}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserCircle className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={language === "he" ? "start" : "end"} className="w-48">
                <DropdownMenuItem onClick={() => navigate("/")}>
                  <Home className="h-4 w-4 me-2" />
                  {t("navCommandCenter")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <Settings className="h-4 w-4 me-2" />
                  {tx({ he: "דשבורד", en: "Dashboard" }, language)}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/plans")}>
                  {t("navSavedPlans")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBadgesOpen(true)}>
                  <Award className="h-4 w-4 me-2" />
                  {tx({ he: "הישגים", en: "Achievements" }, language)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleDarkMode}>
                  {isDark ? <Sun className="h-4 w-4 me-2" /> : <Moon className="h-4 w-4 me-2" />}
                  {isDark ? (tx({ he: "מצב בהיר", en: "Light Mode" }, language)) : (tx({ he: "מצב כהה", en: "Dark Mode" }, language))}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserCircle className="h-4 w-4 me-2" />
                  {tx({ he: "פרופיל", en: "Profile" }, language)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                  <LogOut className="h-4 w-4 me-2" />
                  {tx({ he: "התנתק", en: "Sign Out" }, language)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)} className="gap-1.5 h-9">
              <LogIn className="h-4 w-4" />
              {tx({ he: "התחבר", en: "Sign In" }, language)}
            </Button>
          )}
        </div>
      </div>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <AchievementBadgesPanel open={badgesOpen} onOpenChange={setBadgesOpen} />
      {isOwner && (
        <Suspense fallback={null}>
          <AdminArchetypeDebugPanel open={debugOpen} onOpenChange={setDebugOpen} />
        </Suspense>
      )}
    </>
  );
};

export default AppTopBar;
