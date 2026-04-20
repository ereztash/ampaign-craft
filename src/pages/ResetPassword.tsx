import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { tx } from "@/i18n/tx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";

// Supabase sends the user here after they click the password-reset email link.
// The client picks up the recovery token from the URL hash automatically and
// fires a PASSWORD_RECOVERY event. We listen for that event so we only show
// the form once the session is ready.

const ResetPassword = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError(tx({ he: "סיסמה חייבת להכיל לפחות 6 תווים", en: "Password must be at least 6 characters" }, language));
      return;
    }
    if (password !== confirm) {
      setError(tx({ he: "הסיסמאות לא תואמות", en: "Passwords do not match" }, language));
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
      } else {
        setDone(true);
        setTimeout(() => navigate("/"), 2500);
      }
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 pb-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-accent mx-auto" />
            <p className="font-semibold text-foreground" dir="auto">
              {tx({ he: "הסיסמה עודכנה בהצלחה!", en: "Password updated successfully!" }, language)}
            </p>
            <p className="text-sm text-muted-foreground" dir="auto">
              {tx({ he: "מיד תועבר לאפליקציה...", en: "Redirecting you shortly..." }, language)}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground" dir="auto">
            {tx({ he: "מאמת קישור...", en: "Verifying link..." }, language)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <CardTitle dir="auto">
            {tx({ he: "קביעת סיסמה חדשה", en: "Set New Password" }, language)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password" dir="auto">
              {tx({ he: "סיסמה חדשה", en: "New Password" }, language)}
            </Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tx({ he: "לפחות 6 תווים", en: "At least 6 characters" }, language)}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" dir="auto">
              {tx({ he: "אימות סיסמה", en: "Confirm Password" }, language)}
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={tx({ he: "חזור על הסיסמה", en: "Repeat password" }, language)}
              dir="ltr"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {tx({ he: "עדכן סיסמה", en: "Update Password" }, language)}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
