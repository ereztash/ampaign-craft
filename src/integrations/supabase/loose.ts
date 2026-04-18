// ═══════════════════════════════════════════════
// supabase/loose.ts — single boundary for runtime-only tables
//
// The generated `Database` type only covers tables that ship in the
// committed schema (saved_plans, user_form_data, etc.). FunnelForge
// also writes to runtime-created tables (training_pairs, agent_tasks,
// blackboard_snapshots, quotes, framework_pick_events, …) that haven't
// been promoted into the generated types yet.
//
// Rather than scatter `as unknown as SupabaseClient` casts throughout
// the codebase (which loses ALL typing for the call site) this module
// exposes a single, explicit untyped client. Call sites that need it
// import `supabaseLoose` so the boundary is visible.
//
// To remove a table from this loose surface:
//   1. Add the table to a Supabase migration
//   2. Regenerate the types (`supabase gen types typescript`)
//   3. Switch the call site from `supabaseLoose` back to `supabase`
// ═══════════════════════════════════════════════

import { supabase } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseLoose: SupabaseClient<any, "public", any> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase as unknown as SupabaseClient<any, "public", any>;
