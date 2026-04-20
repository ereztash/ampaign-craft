import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import AchievementBadgesPanel from "@/components/AchievementBadgesPanel";
import { tx } from "@/i18n/tx";
import { Globe, Sun, Moon, LogIn, LogOut, Award, UserCircle, Settings, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDarkMode } from "@/hooks/useDarkMode";
import ModuleProgressStrip from "@/components/ModuleProgressStrip";

interface HeaderProps {
  onSavedPlans?: () => void;
}

const Header = ({ onSavedPlans }: HeaderProps) => {
  const { language, setLanguage, t } = useLanguage();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const isHe = language === "he";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <button aria-label={tx({ he: "דף הבית", en: "FunnelForge Home" }, language)} className="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0" onClick={() => navigate("/")}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg funnel-gradient">
              <span className="text-base font-bold text-accent-foreground">F</span>
            </div>
            <span className="text-lg font-bold text-foreground">{t("appName")}</span>
          </button>

          {/* Clean 3-item nav: Language + UserMenu (Reference: Vercel) */}
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <Button variant="ghost" size="sm" onClick={() => setLanguage(language === "he" ? "en" : "he")} className="gap-1 h-9 min-w-[44px]">
              <Globe className="h-4 w-4" />
              {language === "he" ? "EN" : "עב"}
            </Button>

            {/* User menu dropdown */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0">
                    <UserCircle className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={language === "he" ? "start" : "end"} className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/")}>
                    <Home className="h-4 w-4 me-2" />
                    {tx({ he: "מרכז מודולים", en: "Module Hub" }, language)}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <Settings className="h-4 w-4 me-2" />
                    {tx({ he: "דשבורד", en: "Dashboard" }, language)}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/plans")}>
                    {tx({ he: "תוכניות שמורות", en: "Saved Plans" }, language)}
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
      </header>
      <div className="fixed top-14 left-0 right-0 z-40" style={{ top: "calc(3.5rem + env(safe-area-inset-top))" }}>
        <ModuleProgressStrip />
      </div>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <AchievementBadgesPanel open={badgesOpen} onOpenChange={setBadgesOpen} />
    </>
  );
};

export default Header;
