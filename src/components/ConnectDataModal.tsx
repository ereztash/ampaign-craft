import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Building2, Facebook } from "lucide-react";

interface ConnectDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPlatform?: string | null;
  onOpenImport: () => void;
}

const ConnectDataModal = ({ open, onOpenChange, initialPlatform, onOpenImport }: ConnectDataModalProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle dir="auto">{isHe ? "חיבור מקור נתונים" : "Connect a data source"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          {(initialPlatform === "manual_import" || !initialPlatform) && (
            <Button
              variant="outline"
              className="justify-start gap-2 h-auto py-3"
              onClick={() => {
                onOpenChange(false);
                onOpenImport();
              }}
            >
              <FileSpreadsheet className="h-5 w-5" />
              <span dir="auto">{isHe ? "ייבוא CSV / Excel" : "CSV / Excel import"}</span>
            </Button>
          )}
          {(initialPlatform === "business_profile" || !initialPlatform) && (
            <Button
              variant="outline"
              className="justify-start gap-2 h-auto py-3"
              onClick={() => {
                onOpenChange(false);
                navigate("/wizard");
              }}
            >
              <Building2 className="h-5 w-5" />
              <span dir="auto">{isHe ? "פרופיל עסק (שאלון)" : "Business profile (wizard)"}</span>
            </Button>
          )}
          {(initialPlatform === "meta" || !initialPlatform) && (
            <Button
              variant="outline"
              className="justify-start gap-2 h-auto py-3"
              onClick={() => {
                onOpenChange(false);
                navigate("/data/meta");
              }}
            >
              <Facebook className="h-5 w-5" />
              <span dir="auto">{isHe ? "מודעות מטא (OAuth)" : "Meta Ads (OAuth)"}</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectDataModal;
