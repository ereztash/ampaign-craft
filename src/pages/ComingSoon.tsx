import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock } from "lucide-react";

interface ComingSoonProps {
  featureName?: { he: string; en: string };
  eta?: { he: string; en: string };
}

const DEFAULT_FEATURE = { he: "תכונה זו", en: "This feature" };
const DEFAULT_ETA = { he: "בקרוב", en: "Coming soon" };

const ComingSoon = ({ featureName = DEFAULT_FEATURE, eta = DEFAULT_ETA }: ComingSoonProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">
            {tx({ he: `${featureName.he}: בקרוב`, en: `${featureName.en}: Coming Soon` }, language)}
          </h1>
          <p className="text-muted-foreground">
            {tx(
              {
                he: `${featureName.he} נמצאת בפיתוח ותושק ${eta.he}. משתמשי Beta יקבלו גישה ראשונים.`,
                en: `${featureName.en} is in development and will launch ${eta.en}. Beta users get first access.`,
              },
              language,
            )}
          </p>
        </div>

        <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
          <ArrowRight className="h-4 w-4 rotate-180" />
          {tx({ he: "חזור", en: "Go back" }, language)}
        </Button>
      </div>
    </main>
  );
};

export default ComingSoon;
