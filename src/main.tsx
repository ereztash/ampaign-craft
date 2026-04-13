import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { validateEnv } from "./lib/validateEnv";

validateEnv();

createRoot(document.getElementById("root")!).render(<App />);
