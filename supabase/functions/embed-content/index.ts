// ═══════════════════════════════════════════════
// Embed Content — Edge Function for generating embeddings
// Takes content text, generates embedding via API,
// stores in pgvector for semantic search.
// ═══════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders, corsDenied, isOriginAllowed } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isOriginAllowed(req)) return corsDenied(req);

  const rl = checkRateLimit(req, "embed-content", 20, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify JWT
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { items, userId, planId } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "items array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // Store in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: texts,
      dimensions: 1536,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `Embedding API error: ${response.status}`);
  }

  type OpenAIEmbedding = { index: number; embedding: number[] };
  const rows = data.data as OpenAIEmbedding[];
  return rows
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}
