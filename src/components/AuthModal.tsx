import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tx } from "@/i18n/tx";
import { Loader2 } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const { signIn, signUp } = useAuth();
  const { language } = useLanguage();
  const isHe = language === "he";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (mode: "login" | "register") => {
    setError(null);
    setSuccess(null);
    if (!email || !password) {
      setError(tx({ he: "נא למלא אימייל וסיסמה", en: "Please fill in email and password" }, language));
      return;
    }
    if (password.length < 6) {
      setError(tx({ he: "סיסמה חייבת להכיל לפחות 6 תווים", en: "Password must be at least 6 characters" }, language));
      return;
    }

    setLoading(true);
    const result = mode === "login" ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (mode === "register") {
      setSuccess(tx({ he: "נרשמת בהצלחה!", en: "Registered successfully!" }, language));
      setTimeout(() => onOpenChange(false), 1000);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-center">
            {tx({ he: "התחברות ל-FunnelForge", en: "Sign in to FunnelForge" }, language)}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="login" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{tx({ he: "התחברות", en: "Login" }, language)}</TabsTrigger>
            <TabsTrigger value="register">{tx({ he: "הרשמה", en: "Register" }, language)}</TabsTrigger>
          </TabsList>

          {(["login", "register"] as const).map((mode) => (
            <TabsContent key={mode} value={mode} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor={`${mode}-email`}>{tx({ he: "אימייל", en: "Email" }, language)}</Label>
                <Input
                  id={`${mode}-email`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${mode}-password`}>{tx({ he: "סיסמה", en: "Password" }, language)}</Label>
                <Input
                  id={`${mode}-password`}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tx({ he: "לפחות 6 תווים", en: "At least 6 characters" }, language)}
                  dir="ltr"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
              )}
              {success && (
                <div className="rounded-lg bg-accent/10 p-3 text-sm text-accent-foreground">{success}</div>
              )}

              <Button
                className="w-full"
                onClick={() => handleSubmit(mode)}
                disabled={loading}
              >
                {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {mode === "login"
                  ? (tx({ he: "התחבר", en: "Sign In" }, language))
                  : (tx({ he: "הירשם", en: "Sign Up" }, language))}
              </Button>
            </TabsContent>
          ))}
        </Tabs>

        <p className="text-center text-xs text-muted-foreground mt-2">
          {isHe
            ? "לא חובה. ניתן להשתמש באפליקציה גם כאורח"
            : "Optional. You can use the app as a guest too"}
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
