import { toast } from "sonner";
import { logger } from "./logger";

let quotaToastShown = false;

function handleQuotaError(): void {
  if (quotaToastShown) return;
  quotaToastShown = true;
  toast.error(
    "אחסון מקומי מלא — נקה תוכניות ישנות כדי להמשיך / Storage full — clear old plans to continue",
    { duration: 6000, onAutoClose: () => { quotaToastShown = false; } },
  );
}

export const safeStorage = {
  getJSON<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch (e) {
      logger.warn(`safeStorage.getJSON:${key}`, e);
      return fallback;
    }
  },

  setJSON(key: string, value: unknown): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22)) {
        handleQuotaError();
      }
      logger.error(`safeStorage.setJSON:${key}`, e);
      return false;
    }
  },

  getString(key: string, fallback = ""): string {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch (e) {
      logger.warn(`safeStorage.getString:${key}`, e);
      return fallback;
    }
  },

  setString(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      if (e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22)) {
        handleQuotaError();
      }
      logger.error(`safeStorage.setString:${key}`, e);
      return false;
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      logger.warn(`safeStorage.remove:${key}`, e);
    }
  },
};

export const safeSessionStorage = {
  getJSON<T>(key: string, fallback: T): T {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch (e) {
      logger.warn(`safeSessionStorage.getJSON:${key}`, e);
      return fallback;
    }
  },

  setJSON(key: string, value: unknown): boolean {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      logger.error(`safeSessionStorage.setJSON:${key}`, e);
      return false;
    }
  },

  remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      logger.warn(`safeSessionStorage.remove:${key}`, e);
    }
  },
};
