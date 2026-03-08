import { useLanguage } from "@/i18n/LanguageContext";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg funnel-gradient">
            <span className="text-lg font-bold text-accent-foreground">F</span>
          </div>
          <span className="text-xl font-bold text-foreground">{t("appName")}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLanguage(language === "he" ? "en" : "he")}
          className="gap-2"
        >
          <Globe className="h-4 w-4" />
          {language === "he" ? "EN" : "עב"}
        </Button>
      </div>
    </header>
  );
};

export default Header;
