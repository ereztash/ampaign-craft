// ═══════════════════════════════════════════════
// leadsService — Supabase CRUD for the mini-CRM
//
// Schema lives in supabase/migrations/20260425_001_crm_tables.sql.
// Goes through `supabaseLoose` because the codegen hasn't been run for
// these tables yet — same pattern as other freshly-added tables.
//
// All calls are user-scoped via RLS (auth.uid() = user_id).
// ═══════════════════════════════════════════════

import { supabaseLoose as db } from "@/integrations/supabase/loose";
import { logger } from "@/lib/logger";

// ─── Types ──────────────────────────────────────

export type LeadStatus = "lead" | "meeting" | "proposal" | "closed" | "lost";

export interface Lead {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  business: string;
  status: LeadStatus;
  notes: string;
  valueNIS: number;
  nextFollowup: string | null;
  source: string;
  whyUs: string;
  lostReason: string;
  closedAt: string | null;
  planId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type InteractionType =
  | "note" | "call" | "meeting" | "email" | "whatsapp" | "status_change";

export interface LeadInteraction {
  id: string;
  leadId: string;
  userId: string;
  type: InteractionType;
  note: string;
  occurredAt: string;
}

export type LeadInsert = Omit<Lead, "id" | "createdAt" | "updatedAt" | "userId" | "closedAt"> & {
  closedAt?: string | null;
};
export type LeadUpdate = Partial<Omit<Lead, "id" | "userId" | "createdAt" | "updatedAt">>;

// ─── DB row shape (snake_case) ──────────────────

interface LeadRow {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  business: string;
  status: LeadStatus;
  notes: string;
  value_nis: number | string;
  next_followup: string | null;
  source: string;
  why_us: string;
  lost_reason: string;
  closed_at: string | null;
  plan_id: string | null;
  created_at: string;
  updated_at: string;
}

interface InteractionRow {
  id: string;
  lead_id: string;
  user_id: string;
  type: InteractionType;
  note: string;
  occurred_at: string;
}

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    business: row.business,
    status: row.status,
    notes: row.notes,
    valueNIS: typeof row.value_nis === "string" ? parseFloat(row.value_nis) || 0 : row.value_nis,
    nextFollowup: row.next_followup,
    source: row.source,
    whyUs: row.why_us,
    lostReason: row.lost_reason,
    closedAt: row.closed_at,
    planId: row.plan_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInteraction(row: InteractionRow): LeadInteraction {
  return {
    id: row.id,
    leadId: row.lead_id,
    userId: row.user_id,
    type: row.type,
    note: row.note,
    occurredAt: row.occurred_at,
  };
}

function leadToRow(input: LeadInsert | LeadUpdate, userId?: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (userId) out.user_id = userId;
  if ("name" in input && input.name !== undefined) out.name = input.name;
  if ("phone" in input && input.phone !== undefined) out.phone = input.phone;
  if ("email" in input && input.email !== undefined) out.email = input.email;
  if ("business" in input && input.business !== undefined) out.business = input.business;
  if ("status" in input && input.status !== undefined) out.status = input.status;
  if ("notes" in input && input.notes !== undefined) out.notes = input.notes;
  if ("valueNIS" in input && input.valueNIS !== undefined) out.value_nis = input.valueNIS;
  if ("nextFollowup" in input && input.nextFollowup !== undefined) out.next_followup = input.nextFollowup;
  if ("source" in input && input.source !== undefined) out.source = input.source;
  if ("whyUs" in input && input.whyUs !== undefined) out.why_us = input.whyUs;
  if ("lostReason" in input && input.lostReason !== undefined) out.lost_reason = input.lostReason;
  if ("closedAt" in input && input.closedAt !== undefined) out.closed_at = input.closedAt;
  if ("planId" in input && input.planId !== undefined) out.plan_id = input.planId;
  return out;
}

// ─── Lead CRUD ──────────────────────────────────

export async function listLeads(userId: string): Promise<Lead[]> {
  const { data, error } = await db
    .from("leads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    logger.error("leadsService.listLeads", error);
    return [];
  }
  return ((data as LeadRow[] | null) ?? []).map(mapLead);
}

export async function getLead(leadId: string): Promise<Lead | null> {
  const { data, error } = await db
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();
  if (error) {
    logger.error("leadsService.getLead", error);
    return null;
  }
  return data ? mapLead(data as LeadRow) : null;
}

export async function createLead(userId: string, input: LeadInsert): Promise<Lead | null> {
  const { data, error } = await db
    .from("leads")
    .insert(leadToRow(input, userId))
    .select()
    .single();
  if (error) {
    logger.error("leadsService.createLead", error);
    return null;
  }
  return data ? mapLead(data as LeadRow) : null;
}

export async function updateLead(leadId: string, patch: LeadUpdate): Promise<Lead | null> {
  const { data, error } = await db
    .from("leads")
    .update(leadToRow(patch))
    .eq("id", leadId)
    .select()
    .single();
  if (error) {
    logger.error("leadsService.updateLead", error);
    return null;
  }
  return data ? mapLead(data as LeadRow) : null;
}

export async function deleteLead(leadId: string): Promise<boolean> {
  const { error } = await db.from("leads").delete().eq("id", leadId);
  if (error) {
    logger.error("leadsService.deleteLead", error);
    return false;
  }
  return true;
}

export async function countLeads(userId: string): Promise<number> {
  const { count, error } = await db
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    logger.error("leadsService.countLeads", error);
    return 0;
  }
  return count ?? 0;
}

// ─── Interactions ───────────────────────────────

export async function listInteractions(leadId: string): Promise<LeadInteraction[]> {
  const { data, error } = await db
    .from("lead_interactions")
    .select("*")
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: false });
  if (error) {
    logger.error("leadsService.listInteractions", error);
    return [];
  }
  return ((data as InteractionRow[] | null) ?? []).map(mapInteraction);
}

export async function addInteraction(
  userId: string,
  leadId: string,
  type: InteractionType,
  note: string,
): Promise<LeadInteraction | null> {
  const { data, error } = await db
    .from("lead_interactions")
    .insert({ lead_id: leadId, user_id: userId, type, note })
    .select()
    .single();
  if (error) {
    logger.error("leadsService.addInteraction", error);
    return null;
  }
  return data ? mapInteraction(data as InteractionRow) : null;
}

// ─── Recommendation cache ───────────────────────

export async function getCachedRecommendations(leadId: string): Promise<{
  recommendations: unknown;
  computedAt: string;
} | null> {
  const { data, error } = await db
    .from("lead_recommendations_cache")
    .select("recommendations, computed_at")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (error) {
    logger.error("leadsService.getCachedRecommendations", error);
    return null;
  }
  if (!data) return null;
  const row = data as { recommendations: unknown; computed_at: string };
  return { recommendations: row.recommendations, computedAt: row.computed_at };
}

export async function upsertCachedRecommendations(
  userId: string,
  leadId: string,
  recommendations: unknown,
): Promise<boolean> {
  const { error } = await db
    .from("lead_recommendations_cache")
    .upsert(
      { lead_id: leadId, user_id: userId, recommendations, computed_at: new Date().toISOString() },
      { onConflict: "lead_id" },
    );
  if (error) {
    logger.error("leadsService.upsertCachedRecommendations", error);
    return false;
  }
  return true;
}
