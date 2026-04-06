import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Home, ChevronRight, ChevronLeft } from "lucide-react";

interface BackToHubProps {
  currentPage?: string;
}

const BackToHub = ({ currentPage }: BackToHubProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isHe = language === "he";
  const Separator = isHe ? ChevronLeft : ChevronRight;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className="gap-1.5 text-muted-foreground hover:text-foreground h-7 px-2"
      >
        <Home className="h-3.5 w-3.5" />
        {isHe ? "מרכז" : "Hub"}
      </Button>
      {currentPage && (
        <>
          <Separator className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-xs font-medium text-foreground">{currentPage}</span>
        </>
      )}
    </nav>
  );
};

export default BackToHub;
