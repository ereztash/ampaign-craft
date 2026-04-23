import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
        // Share-token lookup goes through the get-quote-by-token edge
        // function instead of a direct .eq() read on `quotes`. The
        // previous RLS policy granted SELECT on any row with a non-null
        // share_token to every authenticated user, which was a
        // cross-tenant quote leak (CRIT-03). The edge function matches
        // the exact token with the service role and enforces expiry.
        const { data, error: fnError } = await supabase.functions.invoke(
          "get-quote-by-token",
          { body: { token } },
        );

        if (fnError) {
          const status = (fnError as { status?: number }).status;
          if (status === 410) {
            setError(tx({ he: "הצעת מחיר זו פגה תוקף", en: "This quote has expired" }, language));
          } else {
            setError(tx({ he: "הצעת מחיר לא נמצאה", en: "Quote not found" }, language));
          }
          return;
        }

        const quoteRow = (data as { quote?: { data?: Quote } } | null)?.quote;
        if (!quoteRow?.data) {
          setError(tx({ he: "הצעת מחיר לא נמצאה", en: "Quote not found" }, language));
          return;
        }

        setQuote(quoteRow.data);
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
