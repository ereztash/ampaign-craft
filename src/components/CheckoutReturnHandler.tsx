import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { Analytics } from "@/lib/analytics";

// Reacts to the ?checkout=success|cancel query param that Stripe appends when
// redirecting the user back from a hosted Checkout session. On success we
// re-fetch the user's tier from the database (the Stripe webhook has by then
// written the new tier) so the UI updates without a manual reload.

const CheckoutReturnHandler = () => {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const { refreshTier, user, tier } = useAuth();
  const { language } = useLanguage();
  const isHe = language === "he";

  useEffect(() => {
    const params = new URLSearchParams(search);
    const result = params.get("checkout");
    if (result !== "success" && result !== "cancel") return;

    if (result === "success") {
      // Webhook delivery is async — poll a few times so the UI reflects the
      // new tier even if the webhook lands a beat after the redirect.
      let attempts = 0;
      const poll = async () => {
        await refreshTier();
        attempts += 1;
        if (attempts < 6) setTimeout(poll, 1000);
      };
      void poll();

      toast.success(
        isHe ? "התשלום התקבל — תודה!" : "Payment received — thank you!",
        {
          description: isHe
            ? "החשבון שלך משודרג. אם התוכנית לא מעודכנת בתוך דקה, רענן את הדף."
            : "Your account is being upgraded. If the plan does not update within a minute, refresh the page.",
        },
      );

      if (user) Analytics.conversionCompleted(tier, "monthly", user.id);
    } else {
      toast(
        isHe ? "התשלום בוטל" : "Checkout cancelled",
        {
          description: isHe
            ? "התשלום לא הושלם. אפשר לנסות שוב בכל עת."
            : "You didn't complete checkout. You can try again anytime.",
        },
      );
    }

    // Strip the query param so the toast doesn't re-fire on navigation.
    params.delete("checkout");
    const cleaned = params.toString();
    navigate(cleaned ? `${pathname}?${cleaned}` : pathname, { replace: true });
  // Only react once per mount/URL change — deps intentionally minimal.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return null;
};

export default CheckoutReturnHandler;
