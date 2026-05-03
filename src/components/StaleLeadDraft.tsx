// StaleLeadDraft — Wedge 2: stale lead → ready WhatsApp draft.
// Computes a re-engagement message from leadCoachEngine and exposes
// a one-click WhatsApp send. Seals C1 (Anchor), C2 (Signal),
// C3 (Outcome) for stale-lead surfaces.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Lead, LeadInteraction } from "@/services/leadsService";
import type { CrmInsights } from "@/engine/crmInsightEngine";
import { generateLeadRecommendations } from "@/engine/leadCoachEngine";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { captureRecommendationShown } from "@/engine/outcomeLoopEngine";
import { WhatsAppSendButton } from "@/components/WhatsAppSendButton";
import { tx } from "@/i18n/tx";

interface StaleLeadDraftProps {
  lead: Lead;
  interactions: LeadInteraction[];
  crmInsights: CrmInsights;
  daysSinceLastTouch: number;
}

function buildDraftMessage(lead: Lead, recBody: string, isHe: boolean): string {
  const greeting = isHe ? `שלום ${lead.name},` : `Hi ${lead.name},`;
  const intro = isHe
    ? "רציתי לעקוב אחרינו אחרי תקופה של שקט."
    : "I wanted to follow up after some quiet time.";
  const body = recBody.length > 280 ? recBody.slice(0, 277) + "..." : recBody;
  const close = isHe ? "מתי נוח לך לדבר?" : "When works for you to chat?";
  return `${greeting}\n\n${intro}\n\n${body}\n\n${close}`;
}

export function StaleLeadDraft({
  lead,
  interactions,
  crmInsights,
  daysSinceLastTouch,
}: StaleLeadDraftProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHe = language === "he";
  const [recommendationId, setRecommendationId] = useState<string | null>(null);
  const shownRef = useRef(false);

  const recommendation = useMemo(() => {
    const recs = generateLeadRecommendations({
      userDisc: null,
      funnel: null,
      closing: null,
      hormozi: null,
      crmInsights,
      lead,
      interactions: interactions.filter((i) => i.leadId === lead.id),
    });
    return recs[0] ?? null;
  }, [lead, interactions, crmInsights]);

  const message = useMemo(() => {
    const body = recommendation
      ? (isHe ? recommendation.bodyHe : recommendation.bodyEn)
      : (isHe
          ? "רציתי לבדוק איך מתקדם המהלך שדיברנו עליו."
          : "I wanted to check in on the move we discussed.");
    return buildDraftMessage(lead, body, isHe);
  }, [lead, recommendation, isHe]);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    const id = captureRecommendationShown({
      user_id: user?.id ?? null,
      archetype_id: "unknown",
      confidence_tier: "tentative",
      source: "pipeline_pulse",
      action_id: `stale_lead.${lead.id}`,
      action_label_en: "Stale lead re-engagement draft",
      context_snapshot: {
        days_since_last_touch: daysSinceLastTouch,
        has_phone: lead.phone.length > 0,
        recommendation_framework: recommendation?.framework ?? null,
      },
    });
    setRecommendationId(id);
  }, [user?.id, lead.id, lead.phone, daysSinceLastTouch, recommendation]);

  return (
    <li
      className="text-[11px] text-muted-foreground flex items-center gap-1"
      dir="auto"
    >
      <span className="truncate">{lead.name}</span>
      <span className="opacity-70">·</span>
      <span className="opacity-70 shrink-0">
        {tx({ he: `${daysSinceLastTouch} ימים`, en: `${daysSinceLastTouch}d` }, language)}
      </span>
      <div className="ms-auto shrink-0">
        <WhatsAppSendButton
          message={message}
          defaultPhone={lead.phone}
          size="sm"
          variant="ghost"
          label={tx({ he: "שלח", en: "Send" }, language)}
          recommendationId={recommendationId ?? `stale.lead.${lead.id}`}
          leadId={lead.id}
        />
      </div>
    </li>
  );
}
