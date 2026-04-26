import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { TIERS, PricingTier, Feature } from "@/lib/pricingTiers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/i18n/tx";
import { Check, Lock, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackPaywallViewed } from "@/services/eventQueue";
import { Analytics } from "@/lib/analytics";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: Feature;
  requiredTier: PricingTier;
  dataUnlockHint?: { he: string; en: string } | null;
}

const PaywallModal = ({ open, onOpenChange, feature, requiredTier, dataUnlockHint }: PaywallModalProps) => {
  const { language } = useLanguage();
  const { user, setTier, isLocalAuth, tier: currentTier } = useAuth();
  const isHe = language === "he";
  const tier = TIERS.find((t) => t.id === requiredTier) || TIERS[1];
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Track paywall view whenever modal opens. Intentionally fires only on the
  // open transition, not on user/feature/tier changes — those don't represent
  // a new "view" event.
  useEffect(() => {
    if (open && user) {
      trackPaywallViewed(user.id, feature, currentTier).catch(() => {});
    }
  }, [open, user, feature, currentTier]);

  const handleUpgrade = async () => {
    // Track checkout started
    if (user) {
      Analytics.checkoutStarted(requiredTier, user.id);
    }

    if (import.meta.env.DEV && isLocalAuth) {
      // Dev-only: instant tier change for testing
      setTier(requiredTier);
      if (user) Analytics.conversionCompleted(requiredTier, "monthly", user.id);
      toast.success(tx({ he: `שודרגת ל-${tier.name.he}!`, en: `Upgraded to ${tier.name.en}!` }, language));
      onOpenChange(false);
      return;
    }

    // Production: invoke the create-checkout edge function to open a Stripe
    // checkout session for the target tier. Satisfies parameters #46 (Stripe
    // payment) and #48 (Multi-tier pricing) in the market-gap map.
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { tier: requiredTier },
      });
      if (error) throw error;
      const checkoutUrl = (data as { url?: string } | null)?.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      toast.error(tx({ he: "שגיאה בפתיחת תשלום", en: "Could not open checkout" }, language));
    } catch (err) {
      toast.error(
        isHe
          ? "שגיאה בחיבור לתשלום. נסה שוב."
          : "Checkout connection failed. Please try again.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const FEATURE_NAMES: Record<Feature, { he: string; en: string }> = {
    maxFunnels: { he: "משפכים ללא הגבלה", en: "Unlimited funnels" },
    aiCoachMessages: { he: "מאמן שיווק AI", en: "AI Marketing Coach" },
    aiCoachOveragePriceNIS: { he: "מחיר הודעה נוסף", en: "Per-message overage price" },
    pdfExport: { he: "ייצוא PDF", en: "PDF Export" },
    whatsappTemplates: { he: "תבניות WhatsApp", en: "WhatsApp Templates" },
    campaignCockpit: { he: "Campaign Cockpit", en: "Campaign Cockpit" },
    templatePublishing: { he: "פרסום תבניות", en: "Template Publishing" },
    differentiationAgent: { he: "סוכן בידול", en: "Differentiation Agent" },
    seats: { he: "מושבי צוות", en: "Team Seats" },
    brandedReports: { he: "דוחות ממותגים", en: "Branded Reports" },
    prioritySupport: { he: "תמיכה בעדיפות", en: "Priority Support" },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center">
            <Lock className="h-5 w-5 text-primary" />
            {tx({ he: "שדרג את החשבון שלך", en: "Upgrade Your Account" }, language)}
          </DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            {isHe
              ? `${FEATURE_NAMES[feature]?.he || feature} זמין בתוכנית ${tier.name.he}`
              : `${FEATURE_NAMES[feature]?.en || feature} is available in the ${tier.name.en} plan`}
          </p>

          {/* Cost-of-Inaction loss-framing block */}
          <div className="flex items-start gap-2 text-start rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300">
              {isHe
                ? "כל חודש ללא כלי זה מפסיד לעסק שלך לידים וגישה לאסטרטגיה חכמה יותר. המתחרים שלך כבר פועלים."
                : "Every month without this tool costs your business leads and smarter strategy. Your competitors are already acting."}
            </p>
          </div>

          {/* Data-path alternative: unlock by providing data instead of paying */}
          {dataUnlockHint && (
            <div className="flex items-start gap-2 text-start rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
              <Sparkles className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
              <p className="text-xs text-green-300" dir="auto">
                {isHe ? dataUnlockHint.he : dataUnlockHint.en}
              </p>
            </div>
          )}

          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6">
            <Badge className="mb-2">{tier.name[language]}</Badge>
            <div className="text-3xl font-bold text-foreground mb-4">{tier.price[language]}</div>
            <div className="space-y-2 text-start">
              {tier.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>{f[language]}</span>
                </div>
              ))}
            </div>
          </div>

          <Button
            className="w-full cta-warm"
            size="lg"
            onClick={handleUpgrade}
            disabled={checkoutLoading}
          >
            {checkoutLoading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {tx({ he: `שדרג ל-${tier.name.he}`, en: `Upgrade to ${tier.name.en}` }, language)}
          </Button>

          <p className="text-xs text-muted-foreground">
            {tx({ he: "ניתן לבטל בכל עת", en: "Cancel anytime" }, language)}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
