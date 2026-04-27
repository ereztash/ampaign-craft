// ═══════════════════════════════════════════════
// Structural Consistency Manifest
//
// Declares the structural integrity claims of the system:
//   1. Every edge-function invocation in src/ resolves to a real
//      directory under supabase/functions/.
//   2. Every supabase table reference (.from("X")) resolves to a
//      CREATE TABLE (or CREATE VIEW) statement somewhere in
//      supabase/migrations/.
//   3. Every ENGINE_MANIFEST imported in registry.ts points to a
//      real engine file.
//
// This is the layer that catches "phantom calls" (like the previously
// found analytics-ingest invocation that pointed to a non-existent
// edge function and silently failed in production).
// ═══════════════════════════════════════════════

export interface StructuralClaim {
  id: string;
  description: string;
  /**
   * What kind of resolution this claim validates.
   * Each kind has a dedicated check in audit-structural.ts.
   */
  kind: "edge_fn_resolution" | "table_resolution" | "engine_registry_resolution";
  /**
   * Tables/edge-fns/imports that legitimately have no physical artifact.
   * Use sparingly — every entry weakens the audit.
   */
  knownExceptions?: string[];
}

export const STRUCTURAL_CLAIMS: StructuralClaim[] = [
  {
    id: "edge-function-call-resolution",
    description:
      "Every supabase.functions.invoke('X') call site in src/ must resolve to a directory under supabase/functions/",
    kind: "edge_fn_resolution",
  },
  {
    id: "database-table-resolution",
    description:
      "Every .from('X') call in src/ must resolve to a CREATE TABLE or CREATE VIEW for X in supabase/migrations/",
    kind: "table_resolution",
    knownExceptions: [
      // Supabase auth.users is auto-provisioned by Supabase, not in our migrations
      "auth.users",
    ],
  },
  {
    id: "engine-registry-resolution",
    description:
      "Every ENGINE_MANIFEST import in src/engine/blackboard/registry.ts must point to a real engine file",
    kind: "engine_registry_resolution",
  },
];
