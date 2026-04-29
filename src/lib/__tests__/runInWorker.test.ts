import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { runInWorker, runWithFallback, __resetWorkerForTests } from "../runInWorker";

// ── MockWorker emulates the Web Worker API well enough to drive the
//    runInWorker wrapper without spinning a real worker in Node/JSDOM.

class MockWorker {
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: ErrorEvent) => void) | null = null;
  private listeners = new Map<string, Set<(ev: Event) => void>>();
  // caller sets this to control what the "worker" does with each message
  static handler: ((data: unknown, self: MockWorker) => void) | null = null;

  constructor(_url: URL | string, _opts?: WorkerOptions) {}

  postMessage(data: unknown): void {
    queueMicrotask(() => MockWorker.handler?.(data, this));
  }
  terminate(): void { /* no-op */ }
  addEventListener(type: string, cb: (ev: Event) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb);
  }
  removeEventListener(type: string, cb: (ev: Event) => void): void {
    this.listeners.get(type)?.delete(cb);
  }
  dispatchEvent(ev: Event): boolean {
    const set = this.listeners.get(ev.type);
    if (set) for (const cb of set) cb(ev);
    return true;
  }

  /** Test helper: simulate a message *from* the worker. */
  emitMessage(data: unknown): void {
    this.dispatchEvent({ type: "message", data } as unknown as MessageEvent);
  }
  emitError(message: string): void {
    this.dispatchEvent({ type: "error", message } as unknown as ErrorEvent);
  }
}

const origWorker = globalThis.Worker;

beforeEach(() => {
  MockWorker.handler = null;
  // @ts-expect-error test shim
  globalThis.Worker = MockWorker;
  __resetWorkerForTests();
});

afterEach(() => {
  globalThis.Worker = origWorker;
  __resetWorkerForTests();
});

describe("runInWorker", () => {
  it("resolves with the worker's ok payload", async () => {
    MockWorker.handler = (data, self) => {
      const msg = data as { id: string };
      self.emitMessage({ id: msg.id, ok: true, result: { funnelResult: { id: "x" }, graph: {} } });
    };
    const result = await runInWorker("buildFunnel", { formData: {} as never });
    expect((result as { funnelResult: { id: string } }).funnelResult.id).toBe("x");
  });

  it("rejects with the worker's error payload", async () => {
    MockWorker.handler = (data, self) => {
      const msg = data as { id: string };
      self.emitMessage({ id: msg.id, ok: false, error: "boom" });
    };
    await expect(runInWorker("buildFunnel", { formData: {} as never })).rejects.toThrow("boom");
  });

  it("rejects on timeout and stops listening", async () => {
    vi.useFakeTimers();
    // handler never responds
    MockWorker.handler = () => { /* silence */ };
    const p = runInWorker("buildFunnel", { formData: {} as never }, 50);
    vi.advanceTimersByTime(60);
    await expect(p).rejects.toThrow(/timeout/);
    vi.useRealTimers();
  });

  it("ignores replies after timeout (no late resolve)", async () => {
    vi.useFakeTimers();
    let workerSelf: MockWorker | null = null;
    let lastId = "";
    MockWorker.handler = (data, self) => {
      workerSelf = self;
      lastId = (data as { id: string }).id;
    };
    const p = runInWorker("buildFunnel", { formData: {} as never }, 50);
    vi.advanceTimersByTime(60);
    await expect(p).rejects.toThrow(/timeout/);
    // Late reply should be ignored (no unhandled rejection).
    workerSelf!.emitMessage({ id: lastId, ok: true, result: {} });
    vi.useRealTimers();
  });
});

describe("runWithFallback", () => {
  it("falls back when Worker is unavailable", async () => {
    // Remove Worker entirely.
    // @ts-expect-error test shim
    globalThis.Worker = undefined;
    __resetWorkerForTests();

    const fallback = vi.fn(() => ({ funnelResult: { id: "fallback" }, graph: {} }));
    const result = await runWithFallback("buildFunnel", { formData: {} as never }, fallback);
    expect(fallback).toHaveBeenCalledOnce();
    expect((result as { funnelResult: { id: string } }).funnelResult.id).toBe("fallback");
  });

  it("falls back when the worker rejects", async () => {
    MockWorker.handler = (data, self) => {
      const msg = data as { id: string };
      self.emitMessage({ id: msg.id, ok: false, error: "worker crash" });
    };
    const fallback = vi.fn(() => ({ funnelResult: { id: "fallback" }, graph: {} }));
    const result = await runWithFallback("buildFunnel", { formData: {} as never }, fallback);
    expect(fallback).toHaveBeenCalledOnce();
    expect((result as { funnelResult: { id: string } }).funnelResult.id).toBe("fallback");
  });

  it("uses the worker result when available", async () => {
    MockWorker.handler = (data, self) => {
      const msg = data as { id: string };
      self.emitMessage({ id: msg.id, ok: true, result: { funnelResult: { id: "from-worker" }, graph: {} } });
    };
    const fallback = vi.fn(() => ({ funnelResult: { id: "fallback" }, graph: {} }));
    const result = await runWithFallback("buildFunnel", { formData: {} as never }, fallback);
    expect(fallback).not.toHaveBeenCalled();
    expect((result as { funnelResult: { id: string } }).funnelResult.id).toBe("from-worker");
  });
});
