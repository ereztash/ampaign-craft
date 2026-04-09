// ═══════════════════════════════════════════════
// Semantic Search Service — Client-side API for pgvector
// Provides embedding generation + similarity search
// across all user content and plans.
// ═══════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";
import type { FunnelResult } from "@/types/funnel";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface SearchResult {
  id: string;
  planId: string | null;
  contentType: string;
  contentText: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface EmbeddingItem {
  text: string;
  contentType: string;
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════
// CONTENT EXTRACTION
// ═══════════════════════════════════════════════

/**
 * Extract embeddable content items from a funnel result.
 */
export function extractEmbeddableContent(result: FunnelResult): EmbeddingItem[] {
  const items: EmbeddingItem[] = [];

  // Funnel name
  if (result.funnelName?.he) {
    items.push({
      text: `${result.funnelName.he} - ${result.funnelName.en}`,
      contentType: "funnel_name",
      metadata: { planId: result.id },
    });
  }

  // Stages
  for (let i = 0; i < result.stages.length; i++) {
    const stage = result.stages[i];
    const stageText = [
      `${stage.name?.he} (${stage.name?.en})`,
      stage.description?.he,
      `Budget: ${stage.budgetPercent}%`,
      `Channels: ${(stage.channels || []).map((c) => c.name?.en || c.channel).join(", ")}`,
    ].filter(Boolean).join("\n");

    items.push({
      text: stageText,
      contentType: "funnel_stage",
      metadata: { stageIndex: i, stageName: stage.name?.en },
    });
  }

  // Hook tips
  for (const hook of (result.hookTips || [])) {
    if (hook.example?.he) {
      items.push({
        text: `${hook.lawName?.he}: ${hook.example.he}`,
        contentType: "hook",
        metadata: { law: hook.law },
      });
    }
  }

  // Copy formulas
  for (const formula of (result.copyLab?.formulas || [])) {
    if (formula.example?.he) {
      items.push({
        text: `${formula.name?.he}: ${formula.example.he}`,
        contentType: "copy_formula",
        metadata: { formulaName: formula.name?.en },
      });
    }
  }

  // Tips
  for (const tip of (result.overallTips || [])) {
    if (tip.he) {
      items.push({
        text: tip.he,
        contentType: "tip",
      });
    }
  }

  return items;
}

// ═══════════════════════════════════════════════
// EMBEDDING OPERATIONS
// ═══════════════════════════════════════════════

/**
 * Embed all content from a plan and store in pgvector.
 */
export async function embedPlanContent(
  result: FunnelResult,
  userId: string,
  planId?: string
): Promise<{ embedded: number; error?: string }> {
  const items = extractEmbeddableContent(result);

  if (items.length === 0) {
    return { embedded: 0 };
  }

  const { data, error } = await supabase.functions.invoke("embed-content", {
    body: { items, userId, planId: planId || result.id },
  });

  if (error) {
    return { embedded: 0, error: error.message };
  }

  return { embedded: data?.embedded || 0 };
}

// ═══════════════════════════════════════════════
// SEARCH OPERATIONS
// ═══════════════════════════════════════════════

/**
 * Search for similar content across all user plans.
 * First generates an embedding for the query, then searches pgvector.
 */
export async function searchSimilarContent(
  query: string,
  userId: string,
  options: {
    contentType?: string;
    threshold?: number;
    limit?: number;
  } = {}
): Promise<{ results: SearchResult[]; error?: string }> {
  // Generate query embedding via Edge Function
  const { data: embedData, error: embedError } = await supabase.functions.invoke("embed-content", {
    body: {
      items: [{ text: query, contentType: "query" }],
      userId,
      planId: null, // don't store query embeddings
    },
  });

  if (embedError) {
    return { results: [], error: embedError.message };
  }

  // Use the RPC function to search
  const { data, error } = await supabase.rpc("match_content" as any, {
    query_embedding: embedData?.embedding,
    match_user_id: userId,
    match_threshold: options.threshold ?? 0.7,
    match_count: options.limit ?? 10,
    filter_type: options.contentType ?? null,
  });

  if (error) {
    return { results: [], error: error.message };
  }

  const results: SearchResult[] = (data || []).map((row: any) => ({
    id: row.id,
    planId: row.plan_id,
    contentType: row.content_type,
    contentText: row.content_text,
    metadata: row.metadata || {},
    similarity: row.similarity,
  }));

  return { results };
}
