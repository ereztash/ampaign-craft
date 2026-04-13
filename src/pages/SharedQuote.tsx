import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLanguage } from "@/i18n/LanguageContext";
import QuotePreview from "@/components/QuotePreview";
import LoadingFallback from "@/components/LoadingFallback";
import type { Quote } from "@/types/quote";

export default function SharedQuote() {
  const { token } = useParams<{ token: string }>();
  const { language } = useLanguage();
  const isHe = language === "he";

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError(isHe ? "קישור לא תקין" : "Invalid link");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data, error: dbError } = await (supabase as unknown as SupabaseClient)
          .from("quotes")
          .select("data, status, valid_until")
          .eq("share_token", token)
          .maybeSingle();

        if (dbError || !data) {
          setError(isHe ? "הצעת מחיר לא נמצאה" : "Quote not found");
          return;
        }

        if (data.valid_until && new Date(data.valid_until) < new Date()) {
          setError(isHe ? "הצעת מחיר זו פגה תוקף" : "This quote has expired");
          return;
        }

        setQuote(data.data as Quote);
      } catch {
        setError(isHe ? "שגיאה בטעינת ההצעה" : "Error loading quote");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, isHe]);

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
