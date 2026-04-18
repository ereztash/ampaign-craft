import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabaseLoose } from "@/integrations/supabase/loose";
import { tx } from "@/i18n/tx";
import { useLanguage } from "@/i18n/LanguageContext";
import QuotePreview from "@/components/QuotePreview";
import LoadingFallback from "@/components/LoadingFallback";
import type { Quote } from "@/types/quote";
import { Analytics, getUTM } from "@/lib/analytics";

export default function SharedQuote() {
  const { token } = useParams<{ token: string }>();
  const { language } = useLanguage();
  const isHe = language === "he";

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
        const { data, error: dbError } = await supabaseLoose
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

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <QuotePreview quote={quote} language={language} className="shadow-lg" />
    </div>
  );
}
