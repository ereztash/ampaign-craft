import { z } from "zod";

// Zod schemas mirroring the subset of Meta Graph API responses we actually
// consume. Use coerce on numerics because Graph API occasionally returns
// numbers as strings ("123.45").

export const metaTokenExchangeSchema = z.object({
  access_token: z.string().min(20),
  token_type: z.string().optional(),
  expires_in: z.number().int().nonnegative(),
});

export const metaAdAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.string().min(2).max(6),
  account_status: z.number().int().optional(),
});

export const metaAdAccountListSchema = z.object({
  data: z.array(metaAdAccountSchema),
  paging: z.unknown().optional(),
});

export const metaInsightRowSchema = z.object({
  spend: z.coerce.number().nonnegative().optional(),
  impressions: z.coerce.number().nonnegative().optional(),
  clicks: z.coerce.number().nonnegative().optional(),
  cpc: z.coerce.number().nonnegative().optional(),
  cpm: z.coerce.number().nonnegative().optional(),
  ctr: z.coerce.number().nonnegative().optional(),
  reach: z.coerce.number().nonnegative().optional(),
  actions: z.array(z.unknown()).optional(),
  cost_per_action_type: z.array(z.unknown()).optional(),
  date_start: z.string().optional(),
  date_stop: z.string().optional(),
});

export const metaInsightsListSchema = z.object({
  data: z.array(metaInsightRowSchema),
  paging: z.unknown().optional(),
});

export const metaErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.string().optional(),
    code: z.union([z.string(), z.number()]).optional(),
  }),
});

export type MetaTokenExchange = z.infer<typeof metaTokenExchangeSchema>;
export type MetaInsightRow = z.infer<typeof metaInsightRowSchema>;
