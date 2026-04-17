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

function format(level: LogLevel, context: string, errorOrMessage: unknown): void {
  const msg =
    errorOrMessage instanceof Error
      ? errorOrMessage.message
      : String(errorOrMessage);

  if (level === "error") {
    console.error(`[${context}]`, msg, errorOrMessage);
  } else {
    console.warn(`[${context}]`, msg, errorOrMessage);
  }

  const sentry = getSentry();
  if (!sentry) return;

  if (level === "error" && sentry.captureException) {
    sentry.captureException(errorOrMessage, { tags: { context } });
  } else if (level === "warn" && sentry.captureMessage) {
    sentry.captureMessage(`[${context}] ${msg}`, "warning");
  }
}

export const logger: Logger = {
  warn: (context, e) => format("warn", context, e),
  error: (context, e) => format("error", context, e),
};
