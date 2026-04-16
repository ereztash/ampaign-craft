import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { tx } from "@/i18n/tx";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLanguage } from "@/i18n/LanguageContext";
import QuotePreview from "@/components/QuotePreview";
import LoadingFallback from "@/components/LoadingFallback";
import type { Quote } from "@/types/quote";
import { Analytics, getUTM } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

export default function SharedQuote() {
  const { token } = useParams<{ token: string }>();
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError(tx({ he: "קישור לא תקין", en: "Invalid link" }, language));
      setLoading(false);
      return;
    }

    // Track share view — capture referral code from UTM if present
    const utm = getUTM();
    Analytics.shareViewed(token, utm.ref);


    (async () => {
      try {
        const { data, error: dbError } = await (supabase as unknown as SupabaseClient)
          .from("quotes")
          .select("data, status, valid_until")
          .eq("share_token", token)
          .maybeSingle();

        if (dbError || !data) {
          setError(tx({ he: "הצעת מחיר לא נמצאה", en: "Quote not found" }, language));
          return;
        }

        if (data.valid_until && new Date(data.valid_until) < new Date()) {
          setError(tx({ he: "הצעת מחיר זו פגה תוקף", en: "This quote has expired" }, language));
          return;
        }

        setQuote(data.data as Quote);
      } catch {
        setError(tx({ he: "שגיאה בטעינת ההצעה", en: "Error loading quote" }, language));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, isHe, language]);

  if (loading) return <LoadingFallback />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  // Capture referral code from URL for attribution
  const utm = getUTM();
  const refCode = utm.ref as string | undefined;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <QuotePreview quote={quote} language={language} className="shadow-lg" />

      {/* Ref3: Viral CTA at bottom of shared quote — Cialdini Reciprocity */}
      <div className="max-w-2xl mx-auto mt-8 rounded-2xl border border-border bg-background p-6 text-center shadow-sm">
        <p className="text-lg font-bold text-foreground mb-1" dir="auto">
          {isHe ? "אתה רואה הצעת מחיר מקצועית — הנה שלך בחינם." : "You're seeing a professional quote — here's yours, free."}
        </p>
        <p className="text-sm text-muted-foreground mb-4" dir="auto">
          {isHe ? "צור תוכנית שיווק + הצעת מחיר בשתי דקות" : "Build a marketing plan + quote in two minutes"}
        </p>
        <Button
          size="lg"
          className="funnel-gradient border-0 text-accent-foreground px-8 font-semibold"
          onClick={() => navigate(refCode ? `/wizard?ref=${refCode}` : "/wizard")}
        >
          {isHe ? "צור את התוכנית שלך → חינם" : "Create Your Plan → Free"}
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          {isHe ? "אין צורך בכרטיס אשראי" : "No credit card required"}
        </p>
      </div>
    </div>
  );
}
