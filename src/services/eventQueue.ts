// ═══════════════════════════════════════════════
// Event Queue Service — Client-side API for publishing events
// Events are processed by the queue-processor Edge Function.
// ═══════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const db = supabase as unknown as SupabaseClient;

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type EventType =
  | "plan.generated"
  | "plan.qa_requested"
  | "research.requested"
  | "embedding.requested"
  | "benchmark.update"
  | "notification.send";

export interface PublishOptions {
  priority?: number;        // 1=highest, 10=lowest (default 5)
  maxAttempts?: number;     // default 3
  delaySeconds?: number;    // schedule for later (default 0)
}

export interface QueueEvent {
  id: string;
  eventType: EventType;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  result?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════
// PUBLISH
// ═══════════════════════════════════════════════

/**
 * Publish an event to the queue.
 * Returns the event ID for tracking.
 */
export async function publishEvent(
  eventType: EventType,
  payload: Record<string, unknown>,
  userId: string,
  options: PublishOptions = {}
): Promise<{ eventId: string | null; error?: string }> {
  const { data, error } = await db.rpc("publish_event", {
    p_event_type: eventType,
    p_payload: payload,
    p_user_id: userId,
    p_priority: options.priority ?? 5,
    p_max_attempts: options.maxAttempts ?? 3,
    p_delay_seconds: options.delaySeconds ?? 0,
  });

  if (error) {
    return { eventId: null, error: error.message };
  }

  return { eventId: data as string };
}

// ═══════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════

/**
 * Get recent events for the current user.
 */
export async function getRecentEvents(
  userId: string,
  limit = 20
): Promise<{ events: QueueEvent[]; error?: string }> {
  const { data, error } = await db
    .from("event_queue")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { events: [], error: error.message };
  }

  const events: QueueEvent[] = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    eventType: row.event_type,
    payload: row.payload,
    status: row.status,
    attempts: row.attempts,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    error: row.error,
    result: row.result,
  }));

  return { events };
}

/**
 * Get event status by ID.
 */
export async function getEventStatus(
  eventId: string
): Promise<{ event: QueueEvent | null; error?: string }> {
  const { data, error } = await db
    .from("event_queue")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) {
    return { event: null, error: error.message };
  }

  if (!data) return { event: null };

  const row = data as Record<string, unknown>;
  return {
    event: {
      id: row.id,
      eventType: row.event_type,
      payload: row.payload,
      status: row.status,
      attempts: row.attempts,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      error: row.error,
      result: row.result,
    },
  };
}

// ═══════════════════════════════════════════════
// CONVENIENCE PUBLISHERS
// ═══════════════════════════════════════════════

/**
 * Notify the system that a new plan was generated.
 * Triggers embedding, benchmark update, and notifications.
 */
export async function onPlanGenerated(
  planId: string,
  userId: string
): Promise<{ eventId: string | null; error?: string }> {
  return publishEvent("plan.generated", { planId, userId }, userId, { priority: 3 });
}

/**
 * Request QA analysis for a plan.
 */
export async function requestQA(
  planId: string,
  userId: string
): Promise<{ eventId: string | null; error?: string }> {
  return publishEvent("plan.qa_requested", { planId, userId }, userId, { priority: 2 });
}

/**
 * Request research on a specific question.
 */
export async function requestResearch(
  question: string,
  domain: string,
  userId: string
): Promise<{ eventId: string | null; error?: string }> {
  return publishEvent("research.requested", { question, domain, userId }, userId, { priority: 4 });
}
