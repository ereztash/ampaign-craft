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
const CURRENT_CONSENT_VERSION = "2.0";

export function loadConsent(): ConsentRecord | null {
  const stored = safeStorage.getJSON<ConsentRecord | null>(CONSENT_KEY, null);
  // Force re-prompt when consent schema bumps (Planet49 / GDPR Art. 7).
  if (stored && stored.version !== CURRENT_CONSENT_VERSION) return null;
  return stored;
}

export function saveConsent(consent: ConsentRecord): void {
  safeStorage.setJSON(CONSENT_KEY, consent);
}

export function clearConsent(): void {
  safeStorage.remove(CONSENT_KEY);
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
      version: CURRENT_CONSENT_VERSION,
    };
    saveConsent(updated);
    setConsent(updated);
  }, []);

  const withdrawConsent = useCallback(() => {
    clearConsent();
    setConsent(null);
  }, []);

  return {
    consent,
    updateConsent,
    withdrawConsent,
    hasConsented: consent?.dataProcessing === true,
  };
}

interface ConsentBannerProps {
  onAccept?: () => void;
}

const ConsentBanner = ({ onAccept }: ConsentBannerProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  // GDPR / Planet49: no pre-ticked boxes. Necessary processing is the only
  // box that needs to be true to use the service, but the user must check it
  // themselves.
  const [dataProcessing, setDataProcessing] = useState(false);
  const [trainingOpt, setTrainingOpt] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!hasConsented()) {
      setVisible(true);
    }
  }, []);

  const persist = (consent: ConsentRecord) => {
    saveConsent(consent);
    setVisible(false);
    onAccept?.();
  };

  const handleAcceptSelected = () => {
    persist({
      dataProcessing,
      trainingDataOptIn: trainingOpt,
      marketingEmails: marketing,
      analytics,
      consentedAt: new Date().toISOString(),
      version: CURRENT_CONSENT_VERSION,
    });
  };

  const handleAcceptAll = () => {
    persist({
      dataProcessing: true,
      trainingDataOptIn: true,
      marketingEmails: true,
      analytics: true,
      consentedAt: new Date().toISOString(),
      version: CURRENT_CONSENT_VERSION,
    });
  };

  const handleRejectAll = () => {
    persist({
      dataProcessing: true, // necessary for the service to function
      trainingDataOptIn: false,
      marketingEmails: false,
      analytics: false,
      consentedAt: new Date().toISOString(),
      version: CURRENT_CONSENT_VERSION,
    });
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 pointer-events-none">
      <Card className="w-full max-w-lg animate-in slide-in-from-bottom-4 pointer-events-auto shadow-2xl border-primary/20">
        <CardContent className="p-6 space-y-4" dir="auto">
          <h3 className="text-lg font-semibold">
            {tx({ he: "הגנת פרטיות והסכמה", en: "Privacy & Consent" }, language)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isHe
              ? "אנו משתמשים בעוגיות וטכנולוגיות דומות. ניתן לקבל הכול, לדחות הכול, או להתאים לפי קטגוריה."
              : "We use cookies and similar technologies. You can accept all, reject all, or customize by category."}
          </p>

          {!showDetails ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button onClick={handleAcceptAll} className="flex-1">
                {tx({ he: "קבל הכול", en: "Accept all" }, language)}
              </Button>
              <Button onClick={handleRejectAll} variant="outline" className="flex-1">
                {tx({ he: "דחה הכול", en: "Reject all" }, language)}
              </Button>
              <Button
                onClick={() => setShowDetails(true)}
                variant="ghost"
                className="flex-1"
              >
                {tx({ he: "התאמה אישית", en: "Customize" }, language)}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={dataProcessing}
                    onCheckedChange={(c) => setDataProcessing(!!c)}
                  />
                  <span className="text-sm">
                    <strong>
                      {tx({ he: "עיבוד הכרחי", en: "Necessary processing" }, language)}
                    </strong>
                    {" - "}
                    {isHe
                      ? "נחוץ לתפעול השירות (אימות, שמירת תכניות). חובה להמשך השימוש."
                      : "Required to operate the service (authentication, plan storage). Required to proceed."}
                  </span>
                </label>

                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={analytics}
                    onCheckedChange={(c) => setAnalytics(!!c)}
                  />
                  <span className="text-sm">
                    <strong>
                      {tx({ he: "אנליטיקה", en: "Analytics" }, language)}
                    </strong>
                    {" - "}
                    {isHe
                      ? "Google Analytics 4 - סטטיסטיקות שימוש אנונימיות לשיפור המוצר."
                      : "Google Analytics 4 - anonymous usage statistics to improve the product."}
                  </span>
                </label>

                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={trainingOpt}
                    onCheckedChange={(c) => setTrainingOpt(!!c)}
                  />
                  <span className="text-sm">
                    <strong>
                      {tx({ he: "שיפור AI", en: "AI improvement" }, language)}
                    </strong>
                    {" - "}
                    {isHe
                      ? "שימוש בנתונים אנונימיים לשיפור איכות ההמלצות."
                      : "Use anonymized data to improve recommendation quality."}
                  </span>
                </label>

                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={marketing}
                    onCheckedChange={(c) => setMarketing(!!c)}
                  />
                  <span className="text-sm">
                    <strong>
                      {tx({ he: "שיווק", en: "Marketing" }, language)}
                    </strong>
                    {" - "}
                    {isHe
                      ? "אימייל עם עדכוני מוצר וטיפים. ניתן לבטל בכל עת."
                      : "Product updates and tips by email. Unsubscribe anytime."}
                  </span>
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <Button onClick={handleAcceptSelected} disabled={!dataProcessing} className="flex-1">
                  {tx({ he: "שמור בחירה", en: "Save selection" }, language)}
                </Button>
                <Button onClick={() => setShowDetails(false)} variant="ghost" className="flex-1">
                  {tx({ he: "חזור", en: "Back" }, language)}
                </Button>
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            <Link to="/privacy" className="underline">
              {tx({ he: "מדיניות פרטיות", en: "Privacy policy" }, language)}
            </Link>
            {" · "}
            <Link to="/subprocessors" className="underline">
              {tx({ he: "ספקי משנה", en: "Subprocessors" }, language)}
            </Link>
            {" · "}
            <Link to="/terms" className="underline">
              {tx({ he: "תנאי שימוש", en: "Terms" }, language)}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsentBanner;
