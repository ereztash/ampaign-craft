import { Facebook, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MetaAdAccount } from "@/types/meta";
import { useLanguage } from "@/i18n/LanguageContext";

interface MetaConnectProps {
  connected: boolean;
  loading: boolean;
  error: string | null;
  accounts: MetaAdAccount[];
  selectedAccountId: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onSelectAccount: (id: string, name: string) => void;
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
}: MetaConnectProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";

  if (loading) {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="flex items-center gap-3 py-6">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700">
            {isHe ? "מתחבר לחשבון מטא..." : "Connecting to Meta..."}
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
            {isHe ? "חבר חשבון Meta Ads" : "Connect Meta Ads Account"}
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
          <Button onClick={onConnect} className="gap-2 bg-[#1877F2] hover:bg-[#1565C0]">
            <Facebook className="h-4 w-4" />
            {isHe ? "כניסה עם Facebook" : "Continue with Facebook"}
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
    <Card className="border-green-200 bg-green-50/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {isHe ? "מחובר ל-Meta Ads" : "Connected to Meta Ads"}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onDisconnect} className="text-muted-foreground">
            {isHe ? "נתק" : "Disconnect"}
          </Button>
        </div>
      </CardHeader>
      {accounts.length > 0 && (
        <CardContent>
          <p className="text-sm font-medium mb-3">
            {isHe ? "בחר חשבון פרסום לניטור:" : "Select ad account to monitor:"}
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
        </CardContent>
      )}
    </Card>
  );
};

export default MetaConnect;
