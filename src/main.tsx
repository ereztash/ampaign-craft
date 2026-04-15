import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { validateEnv } from "./lib/validateEnv";
import { captureUTM } from "./lib/analytics";

validateEnv();

// Capture UTM params on every page load (survives client-side navigation)
captureUTM();

createRoot(document.getElementById("root")!).render(<App />);
