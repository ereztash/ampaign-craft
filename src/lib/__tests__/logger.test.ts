import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "../logger";

describe("logger", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up any window.Sentry we set
    delete (window as Record<string, unknown>).Sentry;
  });

  // ── logger.warn ───────────────────────────────────────────────────────

  describe("logger.warn", () => {
    it("calls console.warn with context and message", () => {
      logger.warn("myContext", "something went wrong");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[myContext]",
        "something went wrong",
        "something went wrong",
      );
    });

    it("extracts message from Error objects", () => {
      const err = new Error("error message");
      logger.warn("ctx", err);
      expect(consoleWarnSpy).toHaveBeenCalledWith("[ctx]", "error message", err);
    });

    it("converts non-string non-Error to string", () => {
      logger.warn("ctx", 42);
      expect(consoleWarnSpy).toHaveBeenCalledWith("[ctx]", "42", 42);
    });

    it("calls Sentry.captureMessage when Sentry is available", () => {
      const captureMessage = vi.fn();
      (window as Record<string, unknown>).Sentry = { captureMessage };

      logger.warn("sentryCtx", "a warning");

      expect(captureMessage).toHaveBeenCalledWith("[sentryCtx] a warning", "warning");
    });

    it("does NOT call Sentry.captureException for warn level", () => {
      const captureException = vi.fn();
      (window as Record<string, unknown>).Sentry = { captureException };

      logger.warn("ctx", "warn");

      expect(captureException).not.toHaveBeenCalled();
    });

    it("does not throw when Sentry is undefined", () => {
      delete (window as Record<string, unknown>).Sentry;
      expect(() => logger.warn("ctx", "msg")).not.toThrow();
    });
  });

  // ── logger.error ──────────────────────────────────────────────────────

  describe("logger.error", () => {
    it("calls console.error with context and message", () => {
      logger.error("errCtx", "critical failure");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[errCtx]",
        "critical failure",
        "critical failure",
      );
    });

    it("extracts message from Error objects", () => {
      const err = new Error("db failure");
      logger.error("dbCtx", err);
      expect(consoleErrorSpy).toHaveBeenCalledWith("[dbCtx]", "db failure", err);
    });

    it("calls Sentry.captureException when Sentry is available", () => {
      const captureException = vi.fn();
      (window as Record<string, unknown>).Sentry = { captureException };

      const err = new Error("oops");
      logger.error("errCtx", err);

      expect(captureException).toHaveBeenCalledWith(err, { tags: { context: "errCtx" } });
    });

    it("does NOT call Sentry.captureMessage for error level", () => {
      const captureMessage = vi.fn();
      (window as Record<string, unknown>).Sentry = { captureMessage };

      logger.error("ctx", "an error");

      expect(captureMessage).not.toHaveBeenCalled();
    });

    it("does not throw when Sentry is undefined", () => {
      delete (window as Record<string, unknown>).Sentry;
      expect(() => logger.error("ctx", "msg")).not.toThrow();
    });

    it("handles null error gracefully", () => {
      expect(() => logger.error("ctx", null)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith("[ctx]", "null", null);
    });
  });

  // ── Sentry availability checks ────────────────────────────────────────

  describe("Sentry integration", () => {
    it("does not call Sentry when window.Sentry is not an object", () => {
      (window as Record<string, unknown>).Sentry = "string_not_object";
      const captureException = vi.fn();

      // Should not crash or call captureException
      expect(() => logger.error("ctx", "msg")).not.toThrow();
      expect(captureException).not.toHaveBeenCalled();
    });

    it("handles Sentry without captureException gracefully", () => {
      (window as Record<string, unknown>).Sentry = { captureMessage: vi.fn() };
      expect(() => logger.error("ctx", new Error("x"))).not.toThrow();
    });

    it("handles Sentry without captureMessage gracefully", () => {
      (window as Record<string, unknown>).Sentry = { captureException: vi.fn() };
      expect(() => logger.warn("ctx", "msg")).not.toThrow();
    });
  });
});
