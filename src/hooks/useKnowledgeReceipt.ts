// useKnowledgeReceipt — churn-guardian integration.
//
// Surfaces the "switching cost" to the user at exactly the moment they
// would otherwise cancel. Numbers come from the knowledge graph (M7):
//   - fact count (currently-valid)
//   - entity count by type
//   - months of accumulated context (first_seen on oldest entity)
//   - cited-fact count (reference_count > 0) = real MOAT signal
//
// Used by the cancellation flow component to render a "Knowledge
// Receipt" that quantifies the data the user would abandon. See
// docs/architecture.md knowledge-and-moat section for the strategy.

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchBusinessTwinSummary,
  type BusinessTwinSummary,
} from "@/services/knowledgeGraphService";
import { supabaseLoose as db } from "@/integrations/supabase/loose";

export interface KnowledgeReceipt {
  summary: BusinessTwinSummary;
  monthsAccumulated: number;
  citedFactCount: number;
  answerCardCount: number;
  /** Human-readable switching-cost narrative. Rendered alongside the cancellation CTA. */
  narrative: { he: string; en: string };
  loading: boolean;
  error: string | null;
}

const EMPTY_SUMMARY: BusinessTwinSummary = {
  factCount: 0,
  entityCount: 0,
  entitiesByType: {},
  recentFacts: [],
};

export function useKnowledgeReceipt(): KnowledgeReceipt {
  const { user } = useAuth();
  const [summary, setSummary] = useState<BusinessTwinSummary>(EMPTY_SUMMARY);
  const [extras, setExtras] = useState({ monthsAccumulated: 0, citedFactCount: 0, answerCardCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [sum, oldestResp, citedResp, cardResp] = await Promise.all([
          fetchBusinessTwinSummary(user.id),
          db
            .from("knowledge_entities")
            .select("first_seen")
            .eq("user_id", user.id)
            .order("first_seen", { ascending: true })
            .limit(1),
          db
            .from("knowledge_facts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .is("valid_until", null)
            .gt("reference_count", 0),
          db
            .from("answer_cards")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        if (cancelled) return;

        const oldest = ((oldestResp.data ?? []) as Array<{ first_seen: string }>)[0];
        const monthsAccumulated = oldest
          ? Math.max(0, Math.round(((Date.now() - new Date(oldest.first_seen).getTime()) / 1000 / 86400) / 30))
          : 0;

        setSummary(sum);
        setExtras({
          monthsAccumulated,
          citedFactCount: citedResp.count ?? 0,
          answerCardCount: cardResp.count ?? 0,
        });
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const narrative = buildNarrative(summary, extras);

  return {
    summary,
    monthsAccumulated: extras.monthsAccumulated,
    citedFactCount: extras.citedFactCount,
    answerCardCount: extras.answerCardCount,
    narrative,
    loading,
    error,
  };
}

function buildNarrative(
  summary: BusinessTwinSummary,
  extras: { monthsAccumulated: number; citedFactCount: number; answerCardCount: number },
): { he: string; en: string } {
  const months = extras.monthsAccumulated;
  const facts = summary.factCount;
  const cited = extras.citedFactCount;
  const cards = extras.answerCardCount;

  if (facts === 0) {
    return {
      he: "המערכת עדיין לא למדה מספיק עליך כדי שהעזיבה תעלה לך משהו מוחשי. אולי כדאי להתחיל לפני שתחליט?",
      en: "The system hasn't learned enough about you yet for leaving to cost you anything meaningful. Maybe try it before deciding?",
    };
  }

  const monthsText = {
    he: months === 0 ? "החודש" : months === 1 ? "חודש" : `${months} חודשים`,
    en: months === 0 ? "this month" : months === 1 ? "1 month" : `${months} months`,
  };

  return {
    he: `המערכת למדה עליך ${facts} עובדות במהלך ${monthsText.he}. ${cited > 0 ? `${cited} מהן כבר השפיעו על התשובות שקיבלת.` : ""} ${cards > 0 ? `בנוסף, ${cards} תשובות מוכנות מחכות לך.` : ""} מתחרה ייקח חודשים לשחזר את זה.`,
    en: `The system has learned ${facts} facts about you over ${monthsText.en}. ${cited > 0 ? `${cited} of them already influenced answers you received.` : ""} ${cards > 0 ? `Plus, ${cards} ready answers are waiting.` : ""} A competitor would need months to reconstruct this.`,
  };
}
