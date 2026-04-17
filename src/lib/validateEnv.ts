// Validates required environment variables at app startup.
// Throws a clear error rather than failing silently at runtime.

const REQUIRED_VARS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
] as const;

export function validateEnv(): void {
  const missing = REQUIRED_VARS.filter(
    (key) => !import.meta.env[key]
  );

  if (missing.length > 0) {
    const list = missing.join(", ");
    throw new Error(
      `Missing required environment variables: ${list}\n` +
      `Copy .env.example to .env and fill in the values.`
    );
  }
}

// Kill-switch: disable Meta integration via env var without redeploying code.
// Set VITE_META_ENABLED=false to hide all Meta UI and short-circuit OAuth flows.
export const META_ENABLED: boolean =
  import.meta.env.VITE_META_ENABLED !== "false";

// Beta scope gate: hide features that are incomplete for Beta users.
// Set VITE_HIDE_INCOMPLETE=true to replace incomplete pages with "Coming Soon".
// Default: false in dev, true in production Beta builds.
export const HIDE_INCOMPLETE: boolean =
  import.meta.env.VITE_HIDE_INCOMPLETE === "true" ||
  (import.meta.env.PROD && import.meta.env.VITE_HIDE_INCOMPLETE !== "false");

// Optional: explicit sentry DSN (only wired in PROD).
export const SENTRY_DSN: string | undefined =
  typeof import.meta.env.VITE_SENTRY_DSN === "string"
    ? import.meta.env.VITE_SENTRY_DSN
    : undefined;

export const APP_ENV: string =
  typeof import.meta.env.VITE_ENV === "string"
    ? import.meta.env.VITE_ENV
    : (import.meta.env.MODE ?? "development");
