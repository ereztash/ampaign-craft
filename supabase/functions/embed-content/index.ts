// ═══════════════════════════════════════════════
// Embed Content — Edge Function for generating embeddings
// Takes content text, generates embedding via API,
// stores in pgvector for semantic search.
// ═══════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildCorsHeaders, corsDenied, isOriginAllowed } from "../_shared/cors.ts";
import { checkRateLimit, checkUserRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { extractBearerToken, requireAuthOrServiceRole } from "../_shared/auth.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Supabase built-in embedding model. 384-dim. No external API key.
// Replaces OpenAI text-embedding-3-small (1536-dim) — see migration
// 20260423_018_embeddings_dim_384.sql.
//
// The Session is created lazily on first use so cold starts don't pay
// the model-load cost until an actual embed request arrives. The
// runtime injects a `Supabase.ai` global that isn't typed in any
// public .d.ts; we model the surface we actually use.
interface SupabaseAiSession {
  run(input: string, opts?: { mean_pool?: boolean; normalize?: boolean }): Promise<number[]>;
}
let embeddingSession: SupabaseAiSession | null = null;
function getEmbeddingSession(): SupabaseAiSession {
  if (!embeddingSession) {
    // @ts-expect-error Supabase global provided by the Edge Runtime
    embeddingSession = new Supabase.ai.Session("gte-small") as SupabaseAiSession;
  }
  return embeddingSession;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isOriginAllowed(req)) return corsDenied(req);

  const rl = checkRateLimit(req, "embed-content", 20, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  // Verify JWT. Allow service-role callers (queue-processor dispatching
  // background embedding work) to skip user auth; they still have to
  // supply a valid userId in the body. Role detection uses the JWT
  // payload claim rather than string-equality against the secret key,
  // which is both timing-safe and tolerant of key rotation.
  if (!extractBearerToken(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const authCtx = await requireAuthOrServiceRole(req);
  if (!authCtx) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const isServiceRole = authCtx.kind === "service_role";
  const supabase = authCtx.supabase;
  const authedUserId: string | null = isServiceRole ? null : (authCtx.userId ?? null);
  if (!isServiceRole && authedUserId) {
    // Per-user cap on embedding calls. Each request can batch up to
    // 2048 items so IP-only limits let a single user drain tokens fast.
    const userRl = checkUserRateLimit(authedUserId, "embed-content", 10, 60_000);
    if (!userRl.allowed) return rateLimitResponse(userRl, corsHeaders);
  }

  try {
    const { items, userId, planId } = await req.json();

    // When the caller is a user JWT (not service role), force their own
    // userId onto the payload so they can't accidentally or maliciously
    // embed content under another user's account.
    if (authedUserId && userId && userId !== authedUserId) {
      return new Response(JSON.stringify({ error: "userId mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "items array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userId || typeof userId !== "string" || !UUID_RE.test(userId)) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (planId !== undefined && planId !== null && (typeof planId !== "string" || !UUID_RE.test(planId))) {
      return new Response(JSON.stringify({ error: "invalid planId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // BOLA defense: when a planId is supplied, verify the userId in the
    // body actually owns that plan. The user-JWT path already pins
    // userId === authedUserId, but service-role callers (queue-processor)
    // could otherwise be tricked into embedding under a (userId, planId)
    // pair where the plan belongs to someone else, polluting another
    // user's plan embeddings and leaking data via subsequent recall.
    if (planId) {
      const { data: planRow, error: planErr } = await supabase
        .from("saved_plans")
        .select("id")
        .eq("id", planId)
        .eq("user_id", userId)
        .maybeSingle();
      if (planErr || !planRow) {
        return new Response(JSON.stringify({ error: "Forbidden: plan does not belong to user" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Generate embeddings in batch (max 2048 items per API call)
    type EmbedItem = { text: string; contentType?: string; metadata?: Record<string, unknown> };
    const typedItems = items as EmbedItem[];
    const texts = typedItems.map((item) => item.text);
    const embeddings = await generateEmbeddings(texts);

    if (embeddings.length !== items.length) {
      return new Response(JSON.stringify({ error: "Embedding count mismatch" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete existing embeddings for this plan (if re-embedding)
    if (planId) {
      await supabase
        .from("content_embeddings")
        .delete()
        .eq("plan_id", planId)
        .eq("user_id", userId);
    }

    // Insert new embeddings
    const rows = typedItems.map((item, i) => ({
      plan_id: planId || null,
      user_id: userId,
      content_type: item.contentType || "unknown",
      content_text: item.text,
      metadata: item.metadata || {},
      embedding: embeddings[i],
    }));

    const { error: insertError } = await supabase
      .from("content_embeddings")
      .insert(rows);

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        embedded: items.length,
        planId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Supabase.ai.Session processes one input at a time. Batch in a
  // Promise.all — the model runs inside the edge function process, so
  // there's no network round-trip per input.
  const session = getEmbeddingSession();
  const vectors = await Promise.all(
    texts.map(async (t) => {
      const v = await session.run(t, {
        mean_pool: true,
        normalize: true,
      });
      return v as number[];
    }),
  );
  // Defensive: every vector must be 384-dim to match the column type.
  for (const v of vectors) {
    if (!Array.isArray(v) || v.length !== 384) {
      throw new Error(`unexpected embedding shape: len=${Array.isArray(v) ? v.length : "n/a"}`);
    }
  }
  return vectors;
}
