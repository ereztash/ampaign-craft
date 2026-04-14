import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { tx } from "@/i18n/tx";
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
          <DialogTitle dir="auto">{tx({ he: "חיבור מקור נתונים", en: "Connect a data source" }, language)}</DialogTitle>
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
              <span dir="auto">{tx({ he: "ייבוא CSV / Excel", en: "CSV / Excel import" }, language)}</span>
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
              <span dir="auto">{tx({ he: "פרופיל עסק (שאלון)", en: "Business profile (wizard)" }, language)}</span>
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
              <span dir="auto">{tx({ he: "מודעות מטא (OAuth)", en: "Meta Ads (OAuth)" }, language)}</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectDataModal;
