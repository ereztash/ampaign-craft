import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { tx } from "@/i18n/tx";
import { Loader2, Sparkles } from "lucide-react";
import { supabaseLoose as db } from "@/integrations/supabase/loose";
import { safeStorage } from "@/lib/safeStorage";
import { logger } from "@/lib/logger";

// One-time welcome modal that prompts the signed-in user for a preferred
// display name. Opens automatically when:
//   - user is signed in (Supabase mode)
//   - profiles.display_name is empty or falls back to the email local part
//   - the user hasn't dismissed/saved it this browser profile before
// Persists a per-user dismissed flag in safeStorage so it never reappears
// after it's been answered or skipped.

const SEEN_KEY_PREFIX = "funnelforge.welcomeName.seen.";

function emailLocalPart(email: string | undefined | null): string {
  if (!email) return "";
  return email.split("@")[0] ?? "";
}

export default function WelcomeNameModal() {
  const { user, isLocalAuth } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || isLocalAuth) return;
    const seenKey = `${SEEN_KEY_PREFIX}${user.id}`;
    if (safeStorage.getString(seenKey) === "1") {
      // Already answered/skipped previously in this browser. Ensure modal is
      // closed if it somehow got opened.
      setOpen(false);
      return;
    }

    const current = user.displayName?.trim() ?? "";
    const emailPrefix = emailLocalPart(user.email);
    // Only prompt when no real display name is set: either empty, or the
    // auto-derived email prefix which is not a personal identity choice.
    const needsSetup = current === "" || current === emailPrefix;
    if (needsSetup) {
      setName("");
      setOpen(true);
    } else {
      // buildSupabaseUser hydration arrived with a real profiles.display_name.
      // If we had preemptively opened the modal based on the minimal user,
      // close it now so the user is not prompted needlessly.
      safeStorage.setString(seenKey, "1");
      setOpen(false);
    }
  }, [user, isLocalAuth]);

  const markSeen = () => {
    if (user) safeStorage.setString(`${SEEN_KEY_PREFIX}${user.id}`, "1");
  };

  const handleSkip = () => {
    markSeen();
    setOpen(false);
  };

  const handleSave = async () => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast({
        title: tx({ he: "חסר שם", en: "Name is required" }, language),
        description: tx({ he: "נא להזין איך לקרוא לך", en: "Please enter what to call you" }, language),
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const { error } = await db
        .from("profiles")
        .upsert({ id: user.id, display_name: trimmed }, { onConflict: "id" });
      if (error) throw error;
      toast({
        title: tx({ he: `נעים מאוד, ${trimmed}!`, en: `Nice to meet you, ${trimmed}!` }, language),
        description: tx(
          { he: "שמרנו את השם שלך. ניתן לשנות מדף הפרופיל בכל רגע.", en: "Saved. You can change it anytime from the profile page." },
          language,
        ),
      });
      markSeen();
      setOpen(false);
      // Reflect in-memory immediately for the rest of the session. Full
      // refresh happens on the next AuthContext rebuild.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("funnelforge:profile-updated"));
      }
    } catch (err) {
      logger.warn("WelcomeNameModal.save", err);
      toast({
        title: tx({ he: "שגיאה בשמירה", en: "Save failed" }, language),
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        // Ignore close attempts while a save is in flight so a failed upsert
        // can't silently mark the user as "seen" and suppress future prompts.
        if (saving) return;
        if (!v) handleSkip(); else setOpen(v);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        aria-describedby={undefined}
        onEscapeKeyDown={(e) => { if (saving) e.preventDefault(); }}
        onPointerDownOutside={(e) => { if (saving) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            {tx({ he: "ברוכים הבאים!", en: "Welcome!" }, language)}
          </DialogTitle>
          <DialogDescription className="pt-2" dir="auto">
            {tx(
              {
                he: "איך לקרוא לך? השם הזה יופיע בהתכתבויות ובהמלצות האישיות.",
                en: "What should we call you? This name will appear in chats and personalized suggestions.",
              },
              language,
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="welcome-name">{tx({ he: "שם פרטי או כינוי", en: "First name or nickname" }, language)}</Label>
            <Input
              id="welcome-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tx({ he: "למשל: ארז", en: "e.g. Alex" }, language)}
              autoFocus
              maxLength={60}
              dir="auto"
              onKeyDown={(e) => { if (e.key === "Enter") void handleSave(); }}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => void handleSave()} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {tx({ he: "שמור", en: "Save" }, language)}
            </Button>
            <Button variant="ghost" onClick={handleSkip} disabled={saving}>
              {tx({ he: "דלג", en: "Skip" }, language)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
