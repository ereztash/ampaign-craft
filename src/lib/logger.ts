// Centralised logger — swap this single file to wire up Sentry, Datadog, etc.
// Usage: logger.warn("context", error) / logger.error("context", error)

type LogLevel = "warn" | "error";

interface Logger {
  warn(context: string, errorOrMessage: unknown): void;
  error(context: string, errorOrMessage: unknown): void;
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

  // TODO: send to error-tracking service
  // Sentry.captureException(errorOrMessage, { tags: { context } });
}

export const logger: Logger = {
  warn: (context, e) => format("warn", context, e),
  error: (context, e) => format("error", context, e),
};
