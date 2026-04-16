// ═══════════════════════════════════════════════
// CompetitorScanCTA — Cialdini Reciprocity Gift
// "Free competitor scan" as pre-signup gift.
// Behavioral: Reciprocity (Cialdini) — give first,
// ask second. Lowers perceived risk to zero.
// ═══════════════════════════════════════════════
import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Scan, CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Analytics } from "@/lib/analytics";

interface CompetitorScanCTAProps {
  className?: string;
}

export function CompetitorScanCTA({ className = "" }: CompetitorScanCTAProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isHe = language === "he";
  const [submitted, setSubmitted] = useState(false);
  const [businessName, setBusinessName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;
    setSubmitted(true);
    Analytics.competitorScanRequested(businessName);
    // Navigate to wizard after 1.5s — carry businessName as state
    setTimeout(() => navigate("/wizard", { state: { prefillBusiness: businessName } }), 1500);
  };

  if (submitted) {
    return (
      <Card className={`border-accent/30 bg-accent/5 ${className}`}>
        <CardContent className="p-6 text-center space-y-3">
          <CheckCircle className="h-10 w-10 text-accent mx-auto" />
          <p className="font-bold text-foreground" dir="auto">
            {isHe ? "הסריקה מוכנה! מכין את הדוח שלך…" : "Scan ready! Preparing your report…"}
          </p>
          <p className="text-sm text-muted-foreground" dir="auto">
            {isHe ? "מועבר לאשף — ייקח 30 שניות" : "Redirecting to wizard — takes 30 seconds"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-orange-500/30 bg-orange-500/5 ${className}`}>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
            <Scan className="h-6 w-6 text-orange-500" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-foreground text-lg" dir="auto">
                {isHe ? "סריקת מתחרים חינמית" : "Free Competitor Scan"}
              </p>
              <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-500 border-orange-500/20">
                <Sparkles className="h-3 w-3 me-1" />
                {isHe ? "מתנה" : "Gift"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground" dir="auto">
              {isHe
                ? "הכנס את שם העסק שלך — נסרוק את המתחרים ונייצר דוח מיצוב חינמי לפני שתקבל החלטה."
                : "Enter your business name — we'll scan competitors and generate a free positioning report before you decide anything."}
            </p>
            <form onSubmit={handleSubmit} className="flex gap-2 mt-3 flex-wrap">
              <Input
                placeholder={isHe ? "שם העסק שלך…" : "Your business name…"}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="flex-1 min-w-[180px]"
                dir="auto"
              />
              <Button type="submit" className="gap-2 cta-warm shrink-0" disabled={!businessName.trim()}>
                {isHe ? "קבל סריקה חינמית" : "Get Free Scan"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground" dir="auto">
              {isHe ? "ללא רישום · ללא כרטיס אשראי" : "No signup required · No credit card"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
