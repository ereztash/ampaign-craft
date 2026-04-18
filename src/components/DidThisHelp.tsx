// "Did this help?" micro-survey — placed at the bottom of individual modules.
// Saves to Supabase `feedback` table as: "DidThisHelp | module: X | helpful: true/false | lang: xx"
// Dismisses on answer (one-shot per module per session via sessionStorage).

import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { safeSessionStorage } from "@/lib/safeStorage";

interface DidThisHelpProps {
  module: string;
  className?: string;
}

export function DidThisHelp({ module, className = "" }: DidThisHelpProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const sessionKey = `funnelforge-dth-${module}`;
  const [state, setState] = useState<"idle" | "thanks">(() =>
    safeSessionStorage.getJSON<string | null>(sessionKey, null) ? "thanks" : "idle"
  );

  async function handleVote(helpful: boolean) {
    safeSessionStorage.setJSON(sessionKey, helpful ? "yes" : "no");
    setState("thanks");

    await supabase.from("feedback").insert({
      message: `DidThisHelp | module: ${module} | helpful: ${helpful} | lang: ${language}`,
      user_id: user?.id ?? null,
      page_url: window.location.pathname,
      user_agent: navigator.userAgent,
      email: null,
    });
  }

  if (state === "thanks") {
    return (
      <p className={`text-xs text-muted-foreground ${className}`}>
        {tx({ he: "תודה על המשוב! 🙏", en: "Thanks for your feedback! 🙏" }, language)}
      </p>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`} dir={language === "he" ? "rtl" : "ltr"}>
      <span className="text-xs text-muted-foreground">
        {tx({ he: "האם זה עזר לך?", en: "Did this help?" }, language)}
      </span>
      <div className="flex gap-1.5">
        <button
          onClick={() => handleVote(true)}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 transition-colors min-h-[36px]"
          aria-label={tx({ he: "כן", en: "Yes" }, language)}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          {tx({ he: "כן", en: "Yes" }, language)}
        </button>
        <button
          onClick={() => handleVote(false)}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive transition-colors min-h-[36px]"
          aria-label={tx({ he: "לא", en: "No" }, language)}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          {tx({ he: "לא", en: "No" }, language)}
        </button>
      </div>
    </div>
  );
}
