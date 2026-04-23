import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { validateEnv } from "./lib/validateEnv";
import { captureUTM, track, initGA4 } from "./lib/analytics";
import { notifyReferralClicked } from "./lib/notificationQueue";
import { scrubSentryEvent, scrubSentryBreadcrumb } from "./lib/sentryRedaction";

validateEnv();
initGA4();

// ─── Sentry — load from CDN so the SDK doesn't inflate the main bundle.
// window.Sentry is already checked by src/lib/logger.ts (getSentry()).
// No-op when VITE_SENTRY_DSN is unset (dev / staging without config).
(function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  const script = document.createElement("script");
  script.src = "https://browser.sentry-cdn.com/8.0.0/bundle.tracing.min.js";
  script.crossOrigin = "anonymous";
  script.onload = () => {
    type SentryGlobal = {
      Sentry?: {
        init: (opts: Record<string, unknown>) => void;
      };
    };
    const w = window as Window & SentryGlobal;
    w.Sentry?.init({
      dsn,
      environment: (import.meta.env.VITE_ENV as string | undefined) ?? "production",
      tracesSampleRate: 0.1,
      // Aggressive redaction: the previous beforeSend only deleted
      // event.request.data and left JWTs in Authorization/Cookie headers,
      // query strings, and breadcrumb data. We now scrub every known
      // sensitive surface before the event leaves the browser.
      beforeSend(event: Record<string, unknown>) {
        return scrubSentryEvent(event);
      },
      beforeBreadcrumb(breadcrumb: Record<string, unknown>) {
        return scrubSentryBreadcrumb(breadcrumb);
      },
    });
  };
  document.head.appendChild(script);
})();

// Capture UTM params on every page load (survives client-side navigation)
captureUTM();

// Track referral link clicks (visitor arrives with ?ref= from a shared referral link)
const _refParam = new URLSearchParams(window.location.search).get("ref");
if (_refParam) {
  track("aarrr.referral.referral_clicked", { referralCode: _refParam }, { uiOnly: true });
  notifyReferralClicked(_refParam);
}

createRoot(document.getElementById("root")!).render(<App />);
