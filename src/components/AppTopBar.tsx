import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import AchievementBadgesPanel from "@/components/AchievementBadgesPanel";
import { Globe, Sun, Moon, LogIn, LogOut, Award, UserCircle, Settings, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Separator } from "@/components/ui/separator";

interface AppTopBarProps {
  title?: string;
}

const AppTopBar = ({ title }: AppTopBarProps) => {
  const { language, setLanguage, t } = useLanguage();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const isHe = language === "he";

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
          <Button variant="ghost" size="sm" onClick={() => setLanguage(language === "he" ? "en" : "he")} className="gap-1 h-9 min-w-[44px]" aria-label={isHe ? "Switch to English" : "עבור לעברית"}>
            <Globe className="h-4 w-4" />
            {language === "he" ? "EN" : "עב"}
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0" aria-label={isHe ? "תפריט משתמש" : "User menu"}>
                  <UserCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isHe ? "start" : "end"} className="w-48">
                <DropdownMenuItem onClick={() => navigate("/")}>
                  <Home className="h-4 w-4 me-2" />
                  {t("navCommandCenter")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <Settings className="h-4 w-4 me-2" />
                  {isHe ? "דשבורד" : "Dashboard"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/plans")}>
                  {t("navSavedPlans")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBadgesOpen(true)}>
                  <Award className="h-4 w-4 me-2" />
                  {isHe ? "הישגים" : "Achievements"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleDarkMode}>
                  {isDark ? <Sun className="h-4 w-4 me-2" /> : <Moon className="h-4 w-4 me-2" />}
                  {isDark ? (isHe ? "מצב בהיר" : "Light Mode") : (isHe ? "מצב כהה" : "Dark Mode")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserCircle className="h-4 w-4 me-2" />
                  {isHe ? "פרופיל" : "Profile"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                  <LogOut className="h-4 w-4 me-2" />
                  {isHe ? "התנתק" : "Sign Out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)} className="gap-1.5 h-9">
              <LogIn className="h-4 w-4" />
              {isHe ? "התחבר" : "Sign In"}
            </Button>
          )}
        </div>
      </div>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <AchievementBadgesPanel open={badgesOpen} onOpenChange={setBadgesOpen} />
    </>
  );
};

export default AppTopBar;
