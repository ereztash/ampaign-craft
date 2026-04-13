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
