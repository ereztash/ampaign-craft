import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { ConsentRecord, DEFAULT_CONSENT } from "@/types/governance";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { tx } from "@/i18n/tx";
import { safeStorage } from "@/lib/safeStorage";

const CONSENT_KEY = "funnelforge-consent";

export function loadConsent(): ConsentRecord | null {
  return safeStorage.getJSON<ConsentRecord | null>(CONSENT_KEY, null);
}

export function saveConsent(consent: ConsentRecord): void {
  safeStorage.setJSON(CONSENT_KEY, consent);
}

export function hasConsented(): boolean {
  const consent = loadConsent();
  return consent?.dataProcessing === true;
}

export function useConsent() {
  const [consent, setConsent] = useState<ConsentRecord | null>(null);

  useEffect(() => {
    setConsent(loadConsent());
  }, []);

  const updateConsent = useCallback((updates: Partial<ConsentRecord>) => {
    const current = loadConsent() ?? DEFAULT_CONSENT;
    const updated: ConsentRecord = {
      ...current,
      ...updates,
      consentedAt: new Date().toISOString(),
      version: "1.0",
    };
    saveConsent(updated);
    setConsent(updated);
  }, []);

  return { consent, updateConsent, hasConsented: consent?.dataProcessing === true };
}

interface ConsentBannerProps {
  onAccept?: () => void;
}

const ConsentBanner = ({ onAccept }: ConsentBannerProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [dataProcessing, setDataProcessing] = useState(true);
  const [trainingOpt, setTrainingOpt] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasConsented()) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    const consent: ConsentRecord = {
      dataProcessing,
      trainingDataOptIn: trainingOpt,
      marketingEmails: false,
      consentedAt: new Date().toISOString(),
      version: "1.0",
    };
    saveConsent(consent);
    setVisible(false);
    onAccept?.();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 pointer-events-none">
      <Card className="w-full max-w-lg animate-in slide-in-from-bottom-4 pointer-events-auto shadow-2xl border-primary/20">
        <CardContent className="p-6 space-y-4" dir="auto">
          <h3 className="text-lg font-semibold">
            {tx({ he: "הגנת פרטיות ותנאי שימוש", en: "Privacy & Terms of Service" }, language)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isHe
              ? "אנו מעבדים מידע עסקי ושיווקי שלך כדי לספק המלצות מותאמות אישית. המידע מאוחסן באופן מאובטח ולא משותף עם צדדים שלישיים."
              : "We process your business and marketing information to provide personalized recommendations. Data is stored securely and not shared with third parties."}
          </p>
          <p className="text-xs text-muted-foreground">
            <Link to="/privacy" className="underline">
              {tx({ he: "מדיניות פרטיות", en: "Privacy policy" }, language)}
            </Link>
            {" · "}
            <Link to="/terms" className="underline">
              {tx({ he: "תנאי שימוש", en: "Terms" }, language)}
            </Link>
          </p>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={dataProcessing} onCheckedChange={(c) => setDataProcessing(!!c)} />
              <span className="text-sm">
                {isHe
                  ? "אני מסכים/ה לעיבוד נתונים לצורך שירות מותאם אישית (חובה)"
                  : "I agree to data processing for personalized service (required)"}
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={trainingOpt} onCheckedChange={(c) => setTrainingOpt(!!c)} />
              <span className="text-sm">
                {isHe
                  ? "אני מסכים/ה שהנתונים שלי ישמשו לשיפור מערכת ה-AI (אופציונלי)"
                  : "I agree to my data being used to improve the AI system (optional)"}
              </span>
            </label>
          </div>

          <Button onClick={handleAccept} disabled={!dataProcessing} className="w-full">
            {tx({ he: "אישור והמשך", en: "Accept & Continue" }, language)}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsentBanner;
