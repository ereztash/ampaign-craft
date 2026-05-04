// ═══════════════════════════════════════════════
// IdentityPrompt — fallback identity capture UI.
//
// Shown when the prospect profile confidence is < 0.6 OR when the user
// explicitly clicks "לא מדויק" on ProspectWelcomeScreen.
//
// Collects:
//   • One-sentence business description (free text)
//   • Optional website / LinkedIn URL for deeper inference
//
// On submit: re-runs prospect research with the richer input,
// then calls onComplete(updatedProfile).
// ═══════════════════════════════════════════════

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { Loader2, ArrowRight } from "lucide-react";
import { safeStorage } from "@/lib/safeStorage";
import type { ProspectProfile } from "@/viewmodels";
import { supabase } from "@/integrations/supabase/client";

interface IdentityPromptProps {
  /** Called when inference completes — passes the updated (or fallback) profile */
  onComplete: (profile: ProspectProfile) => void;
  /** Pre-filled email from auth, if available */
  email?: string;
}

const STORAGE_KEY = "prospect_profile_v1";

export default function IdentityPrompt({ onComplete, email = "" }: IdentityPromptProps) {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError(tx({ he: "נא לתאר את העסק בקצרה", en: "Please briefly describe your business" }, language));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prospect-research`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            email,
            fullName: description, // repurpose fullName field as free-text description
            websiteUrl: url.trim() || undefined,
          }),
        },
      );

      if (res.ok) {
        const profile = (await res.json()) as ProspectProfile;
        const stored = { ...profile, fetchedAt: Date.now() };
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        onComplete(stored);
      } else {
        // Construct a minimal profile so the flow continues
        const fallback: ProspectProfile = {
          email,
          fullName: description,
          confidence: 0.3,
          weakestLeg: "motivation",
          firstScreenMessage: {
            he: "תודה! ניצור עכשיו את הפרופיל שלך",
            en: "Thanks! We'll create your profile now",
          },
          fetchedAt: Date.now(),
        };
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
        onComplete(fallback);
      }
    } catch {
      // Network error — continue with minimal profile
      const fallback: ProspectProfile = {
        email,
        fullName: description,
        confidence: 0.2,
        weakestLeg: "motivation",
        firstScreenMessage: {
          he: "נמשיך עם מה שסיפרת לנו",
          en: "We'll continue with what you told us",
        },
        fetchedAt: Date.now(),
      };
      onComplete(fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-1">
            <h1 className="text-xl font-bold" dir="auto">
              {tx({ he: "ספר לנו על העסק שלך", en: "Tell us about your business" }, language)}
            </h1>
            <p className="text-sm text-muted-foreground" dir="auto">
              {tx(
                {
                  he: "משפט אחד מספיק - נסיק את השאר",
                  en: "One sentence is enough - we'll infer the rest",
                },
                language,
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="identity-description">
              {tx({ he: "תאר את העסק שלך", en: "Describe your business" }, language)}
            </Label>
            <Textarea
              id="identity-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isHe
                  ? "למשל: אני מאמן עסקי לעסקים קטנים בתחום הבנייה"
                  : "e.g. I'm a business coach for small construction companies"
              }
              dir="auto"
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="identity-url">
              {tx({ he: "אתר / LinkedIn (אופציונלי)", en: "Website / LinkedIn (optional)" }, language)}
            </Label>
            <Input
              id="identity-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              dir="ltr"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" dir="auto">
              {error}
            </div>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={loading || !description.trim()}>
            {loading
              ? <Loader2 className="me-2 h-4 w-4 animate-spin" />
              : <ArrowRight className={`h-4 w-4 ${isHe ? "rtl:rotate-180 me-2" : "me-2"}`} />}
            {tx({ he: "המשך", en: "Continue" }, language)}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
