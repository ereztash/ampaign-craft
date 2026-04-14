import { Facebook, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MetaAdAccount } from "@/types/meta";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";

interface MetaConnectProps {
  connected: boolean;
  loading: boolean;
  error: string | null;
  accounts: MetaAdAccount[];
  selectedAccountId: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onSelectAccount: (id: string, name: string) => void;
  lastSyncTimestamp?: number | null;
}

const MetaConnect = ({
  connected,
  loading,
  error,
  accounts,
  selectedAccountId,
  onConnect,
  onDisconnect,
  onSelectAccount,
  lastSyncTimestamp,
}: MetaConnectProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const isStale = lastSyncTimestamp != null && (Date.now() - lastSyncTimestamp) > SEVEN_DAYS_MS;
  const staleDate = lastSyncTimestamp ? new Date(lastSyncTimestamp).toLocaleDateString() : null;

  if (loading) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-3 py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-primary">
            {tx({ he: "מתחבר לחשבון מטא...", en: "Connecting to Meta..." }, language)}
          </span>
        </CardContent>
      </Card>
    );
  }

  if (!connected) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Facebook className="h-5 w-5 text-blue-600" />
            {tx({ he: "חבר חשבון Meta Ads", en: "Connect Meta Ads Account" }, language)}
          </CardTitle>
          <CardDescription>
            {isHe
              ? "חבר את חשבון הפרסום שלך כדי לנטר ביצועים בזמן אמת ולקבל הנחיות מותאמות"
              : "Connect your ad account to monitor performance in real-time and get tailored guidance"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={onConnect} className="gap-2 bg-primary hover:bg-primary/90">
            <Facebook className="h-4 w-4" />
            {tx({ he: "כניסה עם Facebook", en: "Continue with Facebook" }, language)}
          </Button>
          <p className="text-xs text-muted-foreground">
            {isHe
              ? "דרוש הרשאת ads_read בלבד. לא נשנה שום הגדרה בחשבונך."
              : "Requires ads_read permission only. We never modify your account."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50/30 dark:bg-green-900/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {tx({ he: "מחובר ל-Meta Ads", en: "Connected to Meta Ads" }, language)}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onDisconnect} className="text-muted-foreground">
            {tx({ he: "נתק", en: "Disconnect" }, language)}
          </Button>
        </div>
      </CardHeader>
      {accounts.length > 0 && (
        <CardContent>
          <p className="text-sm font-medium mb-3">
            {tx({ he: "בחר חשבון פרסום לניטור:", en: "Select ad account to monitor:" }, language)}
          </p>
          <div className="space-y-2">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => onSelectAccount(account.id, account.name)}
                className={`w-full text-start rounded-lg border px-4 py-3 text-sm transition-colors ${
                  selectedAccountId === account.id
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="font-medium">{account.name}</div>
                <div className="text-xs text-muted-foreground">{account.id}</div>
              </button>
            ))}
          </div>
          {isStale && (
            <Alert className="mt-3 border-amber-200 bg-amber-50/40 dark:border-amber-700/40 dark:bg-amber-900/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
                {isHe
                  ? `הנתונים עודכנו לאחרונה ב-${staleDate} — ייתכן שאינם מעודכנים`
                  : `Data last synced on ${staleDate} — may be stale`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default MetaConnect;
