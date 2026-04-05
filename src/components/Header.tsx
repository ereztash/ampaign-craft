import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import AchievementBadgesPanel from "@/components/AchievementBadgesPanel";
import { Globe, BookMarked, Sun, Moon, LogIn, LogOut, Award, UserCircle, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useDarkMode } from "@/hooks/useDarkMode";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isHe = language === "he";

  const closeMenu = () => setMobileMenuOpen(false);

  // Shared nav items used in both desktop & mobile
  const NavActions = ({ mobile = false }: { mobile?: boolean }) => {
    const btnClass = mobile ? "w-full justify-start h-11 text-sm" : "";
    const btnSize = mobile ? "default" as const : "sm" as const;

    return (
      <>
        {onSavedPlans && (
          <Button variant="ghost" size={btnSize} onClick={() => { onSavedPlans(); closeMenu(); }} className={`gap-2 ${btnClass}`}>
            <BookMarked className="h-4 w-4" />
            {(mobile || true) && <span className={mobile ? "" : "hidden sm:inline"}>{t("savedPlans")}</span>}
          </Button>
        )}
        <Button variant="ghost" size={btnSize} onClick={() => { setBadgesOpen(true); closeMenu(); }} className={`gap-2 ${btnClass}`} title={isHe ? "הישגים" : "Achievements"}>
          <Award className="h-4 w-4" />
          {mobile && <span>{isHe ? "הישגים" : "Achievements"}</span>}
        </Button>
        <Button variant="ghost" size={btnSize} onClick={() => { toggleDarkMode(); if (mobile) closeMenu(); }} className={`gap-2 ${btnClass}`} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {mobile && <span>{isDark ? (isHe ? "מצב בהיר" : "Light Mode") : (isHe ? "מצב כהה" : "Dark Mode")}</span>}
        </Button>
        <Button variant="outline" size={btnSize} onClick={() => { setLanguage(language === "he" ? "en" : "he"); if (mobile) closeMenu(); }} className={`gap-2 ${btnClass}`}>
          <Globe className="h-4 w-4" />
          {language === "he" ? "EN" : "עב"}
        </Button>

        {mobile && <Separator className="my-1" />}

        {user ? (
          <>
            <Button variant="ghost" size={btnSize} onClick={() => { navigate("/profile"); closeMenu(); }} className={`gap-2 ${btnClass}`} title={isHe ? "פרופיל" : "Profile"}>
              <UserCircle className="h-4 w-4" />
              {mobile && <span>{isHe ? "פרופיל" : "Profile"}</span>}
            </Button>
            <Button variant="ghost" size={btnSize} onClick={() => { signOut(); closeMenu(); }} className={`gap-2 ${btnClass}`} title={isHe ? "התנתק" : "Sign out"}>
              <LogOut className="h-4 w-4" />
              {mobile && <span>{isHe ? "התנתק" : "Sign Out"}</span>}
            </Button>
          </>
        ) : (
          <Button variant="ghost" size={btnSize} onClick={() => { setAuthOpen(true); closeMenu(); }} className={`gap-2 ${btnClass}`}>
            <LogIn className="h-4 w-4" />
            <span className={mobile ? "" : "hidden sm:inline"}>{isHe ? "התחבר" : "Sign In"}</span>
          </Button>
        )}
      </>
    );
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg funnel-gradient">
              <span className="text-lg font-bold text-accent-foreground">F</span>
            </div>
            <span className="text-xl font-bold text-foreground">{t("appName")}</span>
          </div>

          {/* Desktop nav (hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-2">
            <NavActions />
          </div>

          {/* Mobile hamburger (visible on mobile only) */}
          <div className="flex sm:hidden items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setLanguage(language === "he" ? "en" : "he")} className="gap-1 h-10 min-w-[44px]">
              <Globe className="h-4 w-4" />
              {language === "he" ? "EN" : "עב"}
            </Button>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="default" className="h-10 w-10 p-0" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={isHe ? "right" : "left"} className="w-[280px] pt-12">
                <nav className="flex flex-col gap-1">
                  <NavActions mobile />
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <AchievementBadgesPanel open={badgesOpen} onOpenChange={setBadgesOpen} />
    </>
  );
};

export default Header;
