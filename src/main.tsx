import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { validateEnv } from "./lib/validateEnv";
import { captureUTM, track } from "./lib/analytics";
import { notifyReferralClicked } from "./lib/notificationQueue";

validateEnv();

// Capture UTM params on every page load (survives client-side navigation)
captureUTM();

// Track referral link clicks (visitor arrives with ?ref= from a shared referral link)
const _refParam = new URLSearchParams(window.location.search).get("ref");
if (_refParam) {
  track("aarrr.referral.referral_clicked", { referralCode: _refParam }, { uiOnly: true });
  notifyReferralClicked(_refParam);
}

createRoot(document.getElementById("root")!).render(<App />);
