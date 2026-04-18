import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { tx } from "@/i18n/tx";
import BackToHub from "@/components/BackToHub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { Loader2, Mail, Phone, MapPin, Clock, FileText } from "lucide-react";
import { BUSINESS_INFO } from "@/lib/businessInfo";
import { Link } from "react-router-dom";

const SUPPORT_EMAIL = "support@funnelforge.app";

type FeedbackRow = {
  email: string | null;
  message: string;
  user_agent: string;
  page_url: string;
  user_id: string | null;
};

const Support = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("[FunnelForge] Beta feedback")}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 5) {
      toast.error(
        tx(
          { he: "ההודעה קצרה מדי (5 תווים לפחות)", en: "Message too short (min 5 chars)" },
          language,
        ),
      );
      return;
    }

    setSubmitting(true);
    try {
      const row: FeedbackRow = {
        email: email.trim() || null,
        message: trimmed,
        user_agent: navigator.userAgent,
        page_url: window.location.href,
        user_id: user?.id ?? null,
      };
      const db = supabase as unknown as {
        from: (t: string) => { insert: (rows: FeedbackRow[]) => Promise<{ error: unknown }> };
      };
      const { error } = await db.from("feedback").insert([row]);
      if (error) throw error;
      setDone(true);
      toast.success(tx({ he: "תודה! קיבלנו.", en: "Thanks! We received it." }, language));
    } catch (err) {
      logger.error("support.submit", err);
      toast.error(
        tx(
          {
            he: "שגיאה בשליחה. נסה שוב או שלח אימייל ישיר.",
            en: "Submission failed. Please retry or email us directly.",
          },
          language,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const lang = language as "he" | "en";

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 pt-4 pb-16">
        <BackToHub currentPage={tx({ he: "תמיכה", en: "Support" }, language)} />

        {/* Business Info Card — required by Israeli payment processors (סולק) */}
        <Card className="mt-6" dir="auto">
          <CardHeader>
            <CardTitle className="text-base">
              {tx({ he: "פרטי בית העסק", en: "Business details" }, language)}
            </CardTitle>
            <CardDescription>
              {tx(
                { he: "פרטי קשר רשמיים לכל פנייה, כולל ביטולים והחזרים.", en: "Official contact info for all inquiries, including cancellations and refunds." },
                language,
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="font-medium text-foreground" dir="auto">
              {BUSINESS_INFO.legalName[lang]} · {BUSINESS_INFO.vatIdLabel[lang]} {BUSINESS_INFO.vatId}
            </div>
            <div className="grid gap-2 text-muted-foreground sm:grid-cols-2">
              <a
                href={`tel:${BUSINESS_INFO.phone.tel}`}
                className="flex items-center gap-2 hover:text-foreground transition-colors"
                dir="ltr"
              >
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{BUSINESS_INFO.phone.display}</span>
              </a>
              <a
                href={`mailto:${BUSINESS_INFO.email}`}
                className="flex items-center gap-2 hover:text-foreground transition-colors break-all"
                dir="ltr"
              >
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{BUSINESS_INFO.email}</span>
              </a>
              <div className="flex items-start gap-2" dir="auto">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{BUSINESS_INFO.address.full[lang]}</span>
              </div>
              <div className="flex items-start gap-2" dir="auto">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{BUSINESS_INFO.hours[lang]}</span>
              </div>
            </div>
            <div className="pt-1">
              <Link
                to="/refund-policy"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                {tx({ he: "תקנון ביטולים והחזרים", en: "Refund & cancellation policy" }, language)}
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6" dir="auto">
          <CardHeader>
            <CardTitle>{tx({ he: "שלח לנו פידבק", en: "Send us feedback" }, language)}</CardTitle>
            <CardDescription>
              {tx(
                {
                  he: "מצאת באג? יש לך בקשה? אנחנו כאן. זמן תגובה: עד 48 שעות בימי עבודה.",
                  en: "Found a bug or have a request? We're listening. Response SLA: 48h on business days.",
                },
                language,
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="space-y-4 text-sm">
                <p>
                  {tx(
                    { he: "הפידבק שלך נשמר. תודה שעוזר לנו להשתפר.", en: "Your feedback was saved. Thank you for helping us improve." },
                    language,
                  )}
                </p>
                <Button variant="outline" onClick={() => navigate(-1)}>
                  {tx({ he: "חזור", en: "Back" }, language)}
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="support-email" className="text-sm font-medium">
                    {tx({ he: "אימייל (אופציונלי)", en: "Email (optional)" }, language)}
                  </label>
                  <Input
                    id="support-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="support-message" className="text-sm font-medium">
                    {tx({ he: "ההודעה שלך", en: "Your message" }, language)}
                  </label>
                  <Textarea
                    id="support-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    maxLength={5000}
                    required
                    placeholder={tx(
                      { he: "מה קרה? מה ציפית שיקרה?", en: "What happened? What did you expect?" },
                      language,
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    {message.length} / 5000
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                    {tx({ he: "שלח", en: "Send" }, language)}
                  </Button>
                  <a href={mailtoHref} className="text-sm text-muted-foreground underline inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" aria-hidden="true" />
                    {tx({ he: "או שלח אימייל", en: "or email us" }, language)}
                  </a>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Support;
