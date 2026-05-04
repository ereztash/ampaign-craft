// OutreachReplyPrompt — Wedge 3: closes the WhatsApp send → reply loop.
// Reads the outreach log for a given lead. If a send exists 48h-30d old
// without a logged reply outcome, shows a 3-button prompt that fires
// captureOutcome with the appropriate outcome_type.

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { tx } from "@/i18n/tx";
import { captureOutcome } from "@/viewmodels";
import { safeStorage } from "@/lib/safeStorage";
import { CheckCircle2, X, TrendingUp } from "lucide-react";

interface OutreachLogEntry {
  leadId: string;
  recommendationId: string;
  sentAt: string;
}

interface ReplyMarker {
  recommendationId: string;
  outcome: "replied" | "no_reply" | "converted";
  loggedAt: string;
}

const LOG_KEY = "funnelforge-outreach-log";
const REPLY_KEY = "funnelforge-outreach-replies";
const PROMPT_AFTER_HOURS = 48;
const PROMPT_BEFORE_DAYS = 30;

interface OutreachReplyPromptProps {
  leadId: string;
  leadValueNIS: number;
}

export function OutreachReplyPrompt({ leadId, leadValueNIS }: OutreachReplyPromptProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const pendingEntry = useMemo<OutreachLogEntry | null>(() => {
    const log = safeStorage.getJSON<OutreachLogEntry[]>(LOG_KEY, []);
    const replies = safeStorage.getJSON<ReplyMarker[]>(REPLY_KEY, []);
    const repliedIds = new Set(replies.map((r) => r.recommendationId));
    const now = Date.now();
    const candidates = log.filter((e) => {
      if (e.leadId !== leadId) return false;
      if (repliedIds.has(e.recommendationId)) return false;
      const ageMs = now - new Date(e.sentAt).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      return ageHours >= PROMPT_AFTER_HOURS && ageHours <= PROMPT_BEFORE_DAYS * 24;
    });
    return candidates.length > 0
      ? candidates.sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0]
      : null;
  }, [leadId]);

  const persistReply = (outcome: ReplyMarker["outcome"]) => {
    if (!pendingEntry) return;
    const replies = safeStorage.getJSON<ReplyMarker[]>(REPLY_KEY, []);
    replies.push({
      recommendationId: pendingEntry.recommendationId,
      outcome,
      loggedAt: new Date().toISOString(),
    });
    safeStorage.setJSON(REPLY_KEY, replies.slice(-500));
  };

  if (submitted || !pendingEntry) return null;

  const handleReplied = () => {
    captureOutcome(pendingEntry.recommendationId, user?.id ?? null, "navigated", 7, 1);
    persistReply("replied");
    setSubmitted(true);
  };

  const handleNoReply = () => {
    captureOutcome(pendingEntry.recommendationId, user?.id ?? null, "dismissed", 7, 0);
    persistReply("no_reply");
    setSubmitted(true);
  };

  const handleConverted = () => {
    captureOutcome(
      pendingEntry.recommendationId,
      user?.id ?? null,
      "revenue_reported",
      30,
      leadValueNIS > 0 ? leadValueNIS : 1,
    );
    persistReply("converted");
    setSubmitted(true);
  };

  const sentDate = new Date(pendingEntry.sentAt).toLocaleDateString(
    tx({ he: "he-IL", en: "en-US" }, language),
  );

  return (
    <Card className="border-primary/30 bg-primary/5 mb-3">
      <CardContent className="p-3 space-y-2">
        <p className="text-xs font-semibold" dir="auto">
          {tx(
            {
              he: `שלחת WhatsApp ב-${sentDate}. התקבלה תגובה?`,
              en: `You sent WhatsApp on ${sentDate}. Got a reply?`,
            },
            language,
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleReplied}
            className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
          >
            <CheckCircle2 className="h-3 w-3" />
            {tx({ he: "כן, תגובה", en: "Yes, replied" }, language)}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleConverted}
            className="gap-1 text-xs"
          >
            <TrendingUp className="h-3 w-3" />
            {tx({ he: "הומר ל-מכירה", en: "Converted" }, language)}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleNoReply} className="gap-1 text-xs">
            <X className="h-3 w-3" />
            {tx({ he: "אין תגובה", en: "No reply" }, language)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
