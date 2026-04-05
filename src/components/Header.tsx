import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import AchievementBadgesPanel from "@/components/AchievementBadgesPanel";
import { Globe, BookMarked, Sun, Moon, LogIn, LogOut, Award, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDarkMode } from "@/hooks/useDarkMode";

interface HeaderProps {
  onSavedPlans?: () => void;
}

const Header = ({ onSavedPlans }: HeaderProps) => {
  const { language, setLanguage, t } = useLanguage();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const { user, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const isHe = language === "he";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg funnel-gradient">
              <span className="text-lg font-bold text-accent-foreground">F</span>
            </div>
            <span className="text-xl font-bold text-foreground">{t("appName")}</span>
          </div>
          <div className="flex items-center gap-2">
            {onSavedPlans && (
              <Button variant="ghost" size="sm" onClick={onSavedPlans} className="gap-2">
                <BookMarked className="h-4 w-4" />
                <span className="hidden sm:inline">{t("savedPlans")}</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setBadgesOpen(true)} title={isHe ? "הישגים" : "Achievements"}>
              <Award className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === "he" ? "en" : "he")}
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              {language === "he" ? "EN" : "עב"}
            </Button>

            {/* Auth button */}
            {user ? (
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline text-xs text-muted-foreground max-w-[120px] truncate">
                  {user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={signOut} title={isHe ? "התנתק" : "Sign out"}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)} className="gap-1.5">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">{isHe ? "התחבר" : "Sign In"}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <AchievementBadgesPanel open={badgesOpen} onOpenChange={setBadgesOpen} />
    </>
  );
};

export default Header;
