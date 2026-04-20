import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tx } from "@/i18n/tx";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Inline brand icons ────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
    </svg>
  );
}

// ── OR divider ────────────────────────────────────────────────────────────────

function OrDivider({ language }: { language: string }) {
  return (
    <div className="relative my-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">
          {tx({ he: "או", en: "or" }, language)}
        </span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type View = "auth" | "forgot";

const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const { signIn, signUp, resetPassword, signInWithProvider } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isHe = language === "he";

  const [view, setView] = useState<View>("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  const reset = () => {
    setView("auth");
    setEmail("");
    setPassword("");
    setError(null);
    setSuccess(null);
    setForgotSent(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

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
      // Keep the modal open so the user can actually read the error.
      // Previously the inline error was cleared by reset() on close.
      setError(result.error);
      toast({
        title: tx({ he: "שגיאת התחברות", en: "Sign-in error" }, language),
        description: result.error,
        variant: "destructive",
      });
    } else if (mode === "register") {
      setSuccess(tx({ he: "נרשמת בהצלחה!", en: "Registered successfully!" }, language));
      setTimeout(() => handleOpenChange(false), 1000);
    } else {
      // Successful email sign-in. Auth state is already updated synchronously
      // by AuthContext.signIn (makeMinimalUser), so the topbar flips immediately.
      handleOpenChange(false);
    }
  };

  const handleSocial = async (provider: "google" | "github" | "facebook") => {
    setError(null);
    setSocialLoading(provider);
    const result = await signInWithProvider(provider);
    setSocialLoading(null);
    if (result.error) setError(result.error);
    // On success the page redirects — modal stays open briefly
  };

  const handleForgot = async () => {
    setError(null);
    if (!email) {
      setError(tx({ he: "נא להזין אימייל", en: "Please enter your email" }, language));
      return;
    }
    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setForgotSent(true);
    }
  };

  const googleLabel = tx({ he: "המשך עם Google", en: "Continue with Google" }, language);
  const googleBusy = socialLoading === "google";

  const socialButtons = (
    <div className="space-y-2">
      {/* Google is the recommended path: one-click, no password required. */}
      <Button
        className="w-full gap-2 h-11 text-base font-medium bg-white text-zinc-900 border border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-sm"
        variant="outline"
        onClick={() => handleSocial("google")}
        disabled={!!socialLoading || loading}
      >
        {googleBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
        <span>{googleLabel}</span>
      </Button>
      <div className="grid grid-cols-2 gap-2">
        {(["github", "facebook"] as const).map((provider) => {
          const icon = provider === "github" ? <GitHubIcon /> : <FacebookIcon />;
          const label = {
            github: tx({ he: "GitHub", en: "GitHub" }, language),
            facebook: tx({ he: "Facebook", en: "Facebook" }, language),
          }[provider];
          const busy = socialLoading === provider;
          return (
            <Button
              key={provider}
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => handleSocial(provider)}
              disabled={!!socialLoading || loading}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>

        {/* ── Forgot Password View ── */}
        {view === "forgot" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center" dir="auto">
                {tx({ he: "שכחתי סיסמה", en: "Forgot Password" }, language)}
              </DialogTitle>
            </DialogHeader>

            {forgotSent ? (
              <div className="py-4 space-y-3 text-center">
                <div className="flex justify-center">
                  <Mail className="h-10 w-10 text-primary" />
                </div>
                <p className="font-semibold text-foreground" dir="auto">
                  {tx({ he: "בדוק את המייל שלך", en: "Check your email" }, language)}
                </p>
                <p className="text-sm text-muted-foreground" dir="auto">
                  {tx({ he: "שלחנו קישור לאיפוס הסיסמה לכתובת שהזנת.", en: "We sent a password reset link to the address you entered." }, language)}
                </p>
                <Button variant="ghost" className="gap-1.5" onClick={() => { setView("auth"); setForgotSent(false); }}>
                  <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                  {tx({ he: "חזרה להתחברות", en: "Back to login" }, language)}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground" dir="auto">
                  {tx({ he: "הזן את האימייל שלך ונשלח קישור לאיפוס הסיסמה.", en: "Enter your email and we'll send a password reset link." }, language)}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">{tx({ he: "אימייל", en: "Email" }, language)}</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    dir="ltr"
                    onKeyDown={(e) => e.key === "Enter" && handleForgot()}
                  />
                </div>
                {error && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
                )}
                <Button className="w-full" onClick={handleForgot} disabled={loading}>
                  {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {tx({ he: "שלח קישור איפוס", en: "Send Reset Link" }, language)}
                </Button>
                <Button variant="ghost" className="w-full gap-1.5" onClick={() => { setView("auth"); setError(null); }}>
                  <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                  {tx({ he: "חזרה להתחברות", en: "Back to login" }, language)}
                </Button>
              </div>
            )}
          </>
        )}

        {/* ── Auth View (Login / Register tabs) ── */}
        {view === "auth" && (
          <>
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
                <TabsContent key={mode} value={mode} className="space-y-3 mt-4">
                  {/* Social buttons */}
                  {socialButtons}

                  <OrDivider language={language} />

                  {/* Email */}
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

                  {/* Password */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`${mode}-password`}>{tx({ he: "סיסמה", en: "Password" }, language)}</Label>
                      {mode === "login" && (
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => { setView("forgot"); setError(null); }}
                        >
                          {tx({ he: "שכחתי סיסמה", en: "Forgot password?" }, language)}
                        </button>
                      )}
                    </div>
                    <Input
                      id={`${mode}-password`}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={tx({ he: "לפחות 6 תווים", en: "At least 6 characters" }, language)}
                      dir="ltr"
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit(mode)}
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
                  )}
                  {success && (
                    <div className="rounded-lg bg-accent/10 p-3 text-sm text-accent-foreground">{success}</div>
                  )}

                  <Button className="w-full" onClick={() => handleSubmit(mode)} disabled={loading || !!socialLoading}>
                    {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {mode === "login"
                      ? tx({ he: "התחבר", en: "Sign In" }, language)
                      : tx({ he: "הירשם", en: "Sign Up" }, language)}
                  </Button>
                </TabsContent>
              ))}
            </Tabs>

            <p className="text-center text-xs text-muted-foreground mt-1">
              {isHe
                ? "לא חובה. ניתן להשתמש באפליקציה גם כאורח"
                : "Optional. You can use the app as a guest too"}
            </p>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
