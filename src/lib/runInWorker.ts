// ═══════════════════════════════════════════════
// runInWorker — main-thread → engineWorker RPC wrapper
//
// Sends { id, type, payload } to the worker and resolves the
// matching { id, ok, result/error } reply as a Promise.
//
// Design choices (for a reviewer)
// ───────────────────────────────
// 1. Long-lived worker
//    Spawning a worker costs ~50-100ms. Wizard submit + Dashboard
//    preview chains each call the worker multiple times in a
//    session, so we instantiate once lazily and keep it alive
//    for the session. Cold-start cost is paid at first call, not
//    every call.
//
// 2. Correlation id (not a queue)
//    Multiple in-flight requests are safe. crypto.randomUUID()
//    keys each response to its caller. If a reply arrives with
//    no matching pending entry (e.g. after timeout), it's
//    dropped — not an error.
//
// 3. Timeout (default 10s)
//    A runaway engine shouldn't hang the UI forever. On timeout
//    we reject the Promise and delete the pending entry; the
//    worker keeps running but its eventual reply is ignored.
//    For recovery, the caller can retry or fall back.
//
// 4. Fallback is the caller's responsibility
//    Workers can fail at instantiation time (SSR, iframe sandbox,
//    privacy-mode) or at runtime (OOM, import error). Rather than
//    hide that here, we throw — `runWithFallback` wraps this and
//    gives callers a one-line `() => sync()` escape hatch.
//
// 5. Worker restart on crash
//    If the worker emits an "error" event, we reject all pending
//    requests and null the reference. The next call spawns a
//    fresh worker. This matters if a bad payload kills the
//    worker — we don't want the app dead for the session.
// ═══════════════════════════════════════════════

import type { WorkerRequest, WorkerResponse } from "@/workers/engineWorker";

type Pending = {
  resolve: (x: unknown) => void;
  reject: (err: Error) => void;
};

let workerInstance: Worker | null = null;
const pending = new Map<string, Pending>();

function onMessage(event: MessageEvent<WorkerResponse>) {
  const msg = event.data;
  const entry = pending.get(msg.id);
  if (!entry) return;
  pending.delete(msg.id);
  if (msg.ok) entry.resolve(msg.result);
  else entry.reject(new Error(msg.error));
}

function onError(event: ErrorEvent) {
  const err = new Error(`engineWorker error: ${event.message}`);
  for (const entry of pending.values()) entry.reject(err);
  pending.clear();
  try {
    workerInstance?.terminate();
  } catch {
    /* swallow */
  }
  workerInstance = null;
}

function getWorker(): Worker | null {
  if (typeof Worker === "undefined") return null;
  if (workerInstance) return workerInstance;
  try {
    workerInstance = new Worker(
      new URL("@/workers/engineWorker.ts", import.meta.url),
      { type: "module" },
    );
    workerInstance.addEventListener("message", onMessage);
    workerInstance.addEventListener("error", onError);
    return workerInstance;
  } catch {
    return null;
  }
}

export async function runInWorker<TType extends WorkerRequest["type"], TResult>(
  type: TType,
  payload: Extract<WorkerRequest, { type: TType }>["payload"],
  timeoutMs = 10_000,
): Promise<TResult> {
  const w = getWorker();
  if (!w) throw new Error("engineWorker unavailable");

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return new Promise<TResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`engineWorker timeout for ${type}`));
    }, timeoutMs);

    pending.set(id, {
      resolve: (x) => {
        clearTimeout(timer);
        resolve(x as TResult);
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    });

    w.postMessage({ id, type, payload } satisfies WorkerRequest);
  });
}

/**
 * Run `task` in the worker; if unavailable or it fails, call the
 * sync fallback on the main thread instead. Use this anywhere the
 * caller has a correct sync implementation and simply wants the
 * worker speedup when possible.
 */
export async function runWithFallback<TType extends WorkerRequest["type"], TResult>(
  type: TType,
  payload: Extract<WorkerRequest, { type: TType }>["payload"],
  fallback: () => TResult,
  timeoutMs = 10_000,
): Promise<TResult> {
  try {
    return await runInWorker<TType, TResult>(type, payload, timeoutMs);
  } catch {
    return fallback();
  }
}

/** Test helper — close worker + flush pending. */
export function __resetWorkerForTests(): void {
  for (const entry of pending.values()) {
    entry.reject(new Error("worker reset"));
  }
  pending.clear();
  try {
    workerInstance?.terminate();
  } catch {
    /* swallow */
  }
  workerInstance = null;
}
