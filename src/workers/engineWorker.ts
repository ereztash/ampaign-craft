// ═══════════════════════════════════════════════
// engineWorker — off-main-thread engine execution
//
// Runs the heaviest pure-compute engines (funnelEngine,
// userKnowledgeGraph) inside a Web Worker so the main thread
// stays free to paint and respond to input during long chains.
//
// Protocol
// ────────
// Main thread sends:  { id, type, payload }
// Worker replies:     { id, ok: true, result }
//                  or { id, ok: false, error }
//
// `id` is a correlation id chosen by the caller. `type` names the
// task. Only pure-compute engines may be registered here — nothing
// that touches localStorage / window / document / DOM. If you need
// browser-only data, load it on the main thread and pass it in
// the payload.
//
// Contract: every task must return within 10s (enforced by
// runInWorker). Exceed that and the caller rejects.
// ═══════════════════════════════════════════════

import {
  generateFunnel,
  personalizeResult,
} from "@/engine/funnelEngine";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import type { FormData, FunnelResult } from "@/types/funnel";
import type { UserKnowledgeGraph } from "@/engine/userKnowledgeGraph";

export type WorkerRequest =
  | { id: string; type: "buildFunnel"; payload: { formData: FormData } };

export type WorkerResponse =
  | { id: string; ok: true; result: { funnelResult: FunnelResult; graph: UserKnowledgeGraph } }
  | { id: string; ok: false; error: string };

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;
  try {
    if (type === "buildFunnel") {
      // Chain matches the Wizard submit path: generate → graph → personalise.
      // The previously-inline version blocked the main thread for
      // ~800-1500ms (funnelEngine is 1,521 LoC + userKnowledgeGraph is
      // 691 LoC, both pure sync). Off-thread here the UI can paint and
      // show a loading state immediately.
      const raw = generateFunnel(payload.formData);
      const graph = buildUserKnowledgeGraph(payload.formData);
      const funnelResult = personalizeResult(raw, graph);
      const response: WorkerResponse = {
        id,
        ok: true,
        result: { funnelResult, graph },
      };
      self.postMessage(response);
      return;
    }
    // Exhaustiveness guard — if new task types are added above and not
    // branched here, TypeScript's never-type makes this line unreachable.
    const _exhaustive: never = type;
    void _exhaustive;
  } catch (err) {
    const response: WorkerResponse = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
});
