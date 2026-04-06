import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const BackToHub = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isHe = language === "he";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate("/")}
      className="gap-1.5 text-muted-foreground hover:text-foreground mb-4"
    >
      <Home className="h-3.5 w-3.5" />
      {isHe ? "חזרה למרכז המודולים" : "Back to Module Hub"}
    </Button>
  );
};

export default BackToHub;
