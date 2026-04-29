// ═══════════════════════════════════════════════
// LimitReachedModal — surfaced *only* when a metered edge function
// returns 402. This is the single place credits are mentioned in
// the UI: the pricing page, onboarding, and AI Coach all stay pure
// subscription. The hidden-overage UX only reveals itself once a
// user has actually consumed value and hit a wall.
//
// Two states:
//   • tier_disallows_action  → upsell to a higher tier (Pro/Business).
//     Free users hitting the wall here have never had credits and
//     don't need to learn what credits are; we send them to the
//     subscription pricing page.
//   • quota_exhausted_no_credits → buy a credit pack.
//     Pro users who exhausted their quota meet credits for the
//     first time. Two pack sizes; we open Stripe Checkout.
// ═══════════════════════════════════════════════

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "@/lib/authFetch";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Zap } from "lucide-react";

export interface LimitReachedDetail {
  reason: "tier_disallows_action" | "quota_exhausted_no_credits";
  actionDisplayKey: string;
  creditCost: number;
  tier: "free" | "pro" | "business";
  used: number;
  limit: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: LimitReachedDetail | null;
}

interface Pack {
  id: "100" | "500";
  credits: number;
  priceLabel: { he: string; en: string };
  hint?: { he: string; en: string };
}

const PACKS: Pack[] = [
  {
    id: "100",
    credits: 100,
    priceLabel: { he: "₪35", en: "₪35" },
  },
  {
    id: "500",
    credits: 500,
    priceLabel: { he: "₪149", en: "₪149" },
    hint: { he: "חיסכון 15%", en: "Save 15%" },
  },
];

export function LimitReachedModal({ open, onOpenChange, detail }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState<"100" | "500" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!detail) return null;

  const isTierBlock = detail.reason === "tier_disallows_action";

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/pricing");
  };

  const handlePurchase = async (pack: Pack) => {
    setPurchasing(pack.id);
    setError(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/purchase-credits`;
      const resp = await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: pack.id }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.status === 503) {
        // Stripe pack price not configured yet by operator.
        setError(
          tx(
            {
              he: "רכישת קרדיטים אינה זמינה כרגע. צור קשר עם התמיכה.",
              en: "Credit purchase is unavailable right now. Please contact support.",
            },
            language,
          ),
        );
        return;
      }
      if (!resp.ok || !data?.url) {
        throw new Error(data?.error || `purchase failed: ${resp.status}`);
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {isTierBlock
              ? tx({ he: "שדרג כדי להמשיך", en: "Upgrade to continue" }, language)
              : tx({ he: "השתמשת בכל ההודעות החודש", en: "You've used all your monthly messages" }, language)}
          </DialogTitle>
          <DialogDescription>
            {isTierBlock
              ? tx(
                  {
                    he: "הפעולה הזו לא כלולה במסלול הנוכחי שלך. שדרג ל-Pro או Business כדי לקבל גישה.",
                    en: "This action isn't included in your current plan. Upgrade to Pro or Business to unlock it.",
                  },
                  language,
                )
              : tx(
                  {
                    he: `השתמשת ב-${detail.used} מתוך ${detail.limit} ההודעות החודש. קנה חבילת קרדיטים כדי להמשיך עכשיו, או חכה לחידוש בחודש הבא.`,
                    en: `You've used ${detail.used} of your ${detail.limit} included messages this month. Buy a credit pack to keep going now, or wait for next month's reset.`,
                  },
                  language,
                )}
          </DialogDescription>
        </DialogHeader>

        {isTierBlock ? (
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tx({ he: "אולי אחר כך", en: "Maybe later" }, language)}
            </Button>
            <Button onClick={handleUpgrade}>
              {tx({ he: "ראה מסלולים", en: "View plans" }, language)}
            </Button>
          </DialogFooter>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {PACKS.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => handlePurchase(pack)}
                  disabled={purchasing !== null}
                  className="rounded-xl border bg-card p-4 text-start transition-colors hover:bg-muted/40 disabled:opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-semibold">{pack.credits}</span>
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tx({ he: "קרדיטים", en: "credits" }, language)}
                  </div>
                  <div className="mt-2 text-base font-medium">
                    {tx(pack.priceLabel, language)}
                  </div>
                  {pack.hint && (
                    <div className="text-xs text-primary">{tx(pack.hint, language)}</div>
                  )}
                  {purchasing === pack.id && (
                    <Loader2 className="mt-2 h-4 w-4 animate-spin text-primary" />
                  )}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {tx(
                {
                  he: "כל פעולה צורכת 1–20 קרדיטים. הקרדיטים תקפים 12 חודשים מרגע הרכישה.",
                  en: "Each action consumes 1–20 credits. Credits are valid for 12 months after purchase.",
                },
                language,
              )}
            </p>

            {error && (
              <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
            )}

            <DialogFooter className="sm:justify-between">
              <Button variant="ghost" size="sm" onClick={handleUpgrade}>
                {tx({ he: "שדרג למסלול ללא הגבלה", en: "Upgrade to unlimited" }, language)}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                {tx({ he: "אחר כך", en: "Later" }, language)}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
