// ═══════════════════════════════════════════════
// Network Resilience — Retry, offline detection, queue
// Provides fault-tolerant wrappers for API calls.
// ═══════════════════════════════════════════════

import { safeStorage } from "@/lib/safeStorage";

const OFFLINE_QUEUE_KEY = "funnelforge-offline-queue";

/**
 * Check if the browser is online.
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/**
 * Retry a function with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), 10_000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Queue an operation for later execution when offline.
 */
interface QueuedOperation {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
}

export function enqueueOfflineOperation(type: string, payload: unknown): void {
  const existing = getOfflineQueue();
  const op: QueuedOperation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
  };
  existing.push(op);
  const trimmed = existing.slice(-100);
  safeStorage.setJSON(OFFLINE_QUEUE_KEY, trimmed);
}

export function getOfflineQueue(): QueuedOperation[] {
  return safeStorage.getJSON<QueuedOperation[]>(OFFLINE_QUEUE_KEY, []);
}

export function clearOfflineQueue(): void {
  safeStorage.remove(OFFLINE_QUEUE_KEY);
}

/**
 * Flush offline queue: process each operation with the provided handler.
 * Removes successfully processed operations.
 */
export async function flushOfflineQueue(
  handler: (type: string, payload: unknown) => Promise<boolean>,
): Promise<{ processed: number; failed: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;
  const remaining: QueuedOperation[] = [];

  for (const op of queue) {
    try {
      const success = await handler(op.type, op.payload);
      if (success) {
        processed++;
      } else {
        remaining.push(op);
        failed++;
      }
    } catch {
      remaining.push(op);
      failed++;
    }
  }

  if (remaining.length === 0) {
    clearOfflineQueue();
  } else {
    safeStorage.setJSON(OFFLINE_QUEUE_KEY, remaining);
  }

  return { processed, failed };
}

/**
 * Setup online/offline event listeners to auto-flush queue.
 */
export function setupNetworkListeners(
  handler: (type: string, payload: unknown) => Promise<boolean>,
): () => void {
  const onOnline = () => {
    void flushOfflineQueue(handler);
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }

  return () => {};
}
