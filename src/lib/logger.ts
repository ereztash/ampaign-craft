// Centralised logger — forwards errors to Sentry when available.
//
// Sentry is loaded lazily via window.Sentry (CDN script) or @sentry/react
// when initialised in main.tsx. This file does not import Sentry directly
// so that the bundle does not depend on it.

type LogLevel = "warn" | "error";

interface Logger {
  warn(context: string, errorOrMessage: unknown): void;
  error(context: string, errorOrMessage: unknown): void;
}

// Minimal subset of the Sentry API we call.
interface SentryLike {
  captureException?: (
    err: unknown,
    options?: { tags?: Record<string, string> },
  ) => void;
  captureMessage?: (msg: string, level?: string) => void;
}

function getSentry(): SentryLike | undefined {
  if (typeof window === "undefined") return undefined;
  const candidate = (window as unknown as { Sentry?: SentryLike }).Sentry;
  return candidate && typeof candidate === "object" ? candidate : undefined;
}

// PII / secret patterns we scrub from log strings before they hit the
// console or Sentry. Covers JWT-like bearer tokens, email addresses,
// Israeli phone numbers, long hex / base64 blobs (likely tokens), and
// the Supabase publishable / anon key prefix.
const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/Bearer\s+[A-Za-z0-9._-]{20,}/gi, "Bearer [redacted]"],
  [/\beyJ[A-Za-z0-9._-]{20,}/g, "[jwt-redacted]"],
  [/sk_(live|test)_[A-Za-z0-9]{16,}/g, "[stripe-key-redacted]"],
  [/\bsbp_[A-Za-z0-9]{16,}/g, "[supabase-key-redacted]"],
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email-redacted]"],
  [/\+?972[-\s]?\d[-\s]?\d{7,8}/g, "[phone-redacted]"],
  [/\b0(5[0-9]|7[27-9])[-\s]?\d{7}\b/g, "[phone-redacted]"],
  [/[A-Fa-f0-9]{40,}/g, "[hex-redacted]"],
];

function redact(input: string): string {
  let out = input;
  for (const [re, repl] of SECRET_PATTERNS) out = out.replace(re, repl);
  return out;
}

function format(level: LogLevel, context: string, errorOrMessage: unknown): void {
  const rawMsg =
    errorOrMessage instanceof Error
      ? errorOrMessage.message
      : String(errorOrMessage);
  const msg = redact(rawMsg);

  // Emit the redacted message plus the raw payload as a third argument so
  // devtools still surfaces the Error stack (or the raw object) while the
  // string-form secrets stay out of the redacted message.
  if (level === "error") {
    console.error(`[${context}]`, msg, errorOrMessage);
  } else {
    console.warn(`[${context}]`, msg, errorOrMessage);
  }

  const sentry = getSentry();
  if (!sentry) return;

  if (level === "error" && sentry.captureException) {
    const toSend = errorOrMessage instanceof Error
      ? Object.assign(new Error(msg), { stack: errorOrMessage.stack })
      : msg;
    sentry.captureException(toSend, { tags: { context } });
  } else if (level === "warn" && sentry.captureMessage) {
    sentry.captureMessage(`[${context}] ${msg}`, "warning");
  }
}

export const logger: Logger = {
  warn: (context, e) => format("warn", context, e),
  error: (context, e) => format("error", context, e),
};
