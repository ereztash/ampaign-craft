// ═══════════════════════════════════════════════
// Kernel Declaration — pure naming module
//
// A single source of truth for the three kernel engines and the
// namespaces the Sentinel rail reads from. This module contains
// no logic and does not touch the behavior of any existing engine.
//
// Constraints (by spec):
//   - No imports. Constants and type predicates only.
// ═══════════════════════════════════════════════

export const KERNEL_ENGINES = [
  "userKnowledgeGraph",
  "discProfileEngine",
  "funnelEngine",
] as const;

export type KernelEngine = (typeof KERNEL_ENGINES)[number];

export const KERNEL_INPUT_PREFIX = "USER-kernel-input-" as const;
export const KERNEL_OUTPUT_PREFIX = "USER-kernel-output-" as const;
export const SYSTEM_NAMESPACE_PREFIX = "SYSTEM-" as const;

/**
 * Type guard: true if `name` is one of the declared kernel engines.
 * Narrows the type of `name` to `KernelEngine` inside the guarded
 * branch so downstream code can rely on it without a cast.
 */
export function isKernelEngine(name: string): name is KernelEngine {
  return (KERNEL_ENGINES as readonly string[]).includes(name);
}
