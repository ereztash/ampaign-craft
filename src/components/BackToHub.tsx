import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useModuleStatus } from "@/hooks/useModuleStatus";
import { Button } from "@/components/ui/button";
import { Home, ChevronRight, ChevronLeft } from "lucide-react";

interface BackToHubProps {
  currentPage?: string;
}

const ROUTE_TO_MODULE: Record<string, string> = {
  "/differentiate": "differentiation",
  "/wizard": "marketing",
  "/sales": "sales",
  "/pricing": "pricing",
  "/retention": "retention",
};

const BackToHub = ({ currentPage }: BackToHubProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { language, t } = useLanguage();
  const isHe = language === "he";
  const Separator = isHe ? ChevronLeft : ChevronRight;
  const modules = useModuleStatus();

  const currentModuleId = ROUTE_TO_MODULE[pathname];
  const currentIndex = modules.findIndex((m) => m.id === currentModuleId);
  const prevModule = currentIndex > 0 ? modules[currentIndex - 1] : null;
  const nextModule = currentIndex >= 0 && currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null;
  const position = currentIndex >= 0 ? `(${currentIndex + 1}/${modules.length})` : "";

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center justify-between text-sm">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="gap-1.5 text-muted-foreground hover:text-foreground h-7 px-2"
        >
          <Home className="h-3.5 w-3.5" />
          {t("navCommandCenter")}
        </Button>
        {currentPage && (
          <>
            <Separator className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              {currentPage} {position && <span className="text-muted-foreground">{position}</span>}
            </span>
          </>
        )}
      </div>

      {/* Prev/Next module navigation */}
      {currentIndex >= 0 && (
        <div className="flex items-center gap-1">
          {prevModule && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(prevModule.route)}
              className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs gap-1"
            >
              {isHe ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
              {prevModule.label[language]}
            </Button>
          )}
          {nextModule && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(nextModule.route)}
              className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs gap-1"
            >
              {nextModule.label[language]}
              {isHe ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          )}
        </div>
      )}
    </nav>
  );
};

export default BackToHub;
