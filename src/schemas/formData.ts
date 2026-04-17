import { z } from "zod";

// Runtime validation for funnel FormData before generation.
// Mirrors src/types/funnel.ts unions, but forbids the "" placeholder values.

export const businessFieldSchema = z.enum([
  "fashion", "tech", "food", "services", "education",
  "health", "realEstate", "tourism", "personalBrand", "other",
]);

export const audienceTypeSchema = z.enum(["b2c", "b2b", "both"]);
export const salesModelSchema = z.enum(["oneTime", "subscription", "leads"]);
export const budgetRangeSchema = z.enum(["low", "medium", "high", "veryHigh"]);
export const mainGoalSchema = z.enum(["awareness", "leads", "sales", "loyalty"]);
export const channelSchema = z.enum([
  "facebook", "instagram", "google", "content", "email",
  "tikTok", "linkedIn", "whatsapp", "other",
]);
export const experienceLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);

export const formDataSchema = z.object({
  businessField: businessFieldSchema,
  audienceType: audienceTypeSchema,
  ageRange: z
    .tuple([z.number().int().min(13).max(120), z.number().int().min(13).max(120)])
    .refine(([a, b]) => a <= b, { message: "ageRange: min must be <= max" }),
  interests: z.string().max(500),
  productDescription: z
    .string()
    .trim()
    .min(10, "תיאור מוצר קצר מדי — 10 תווים לפחות / Description too short — at least 10 characters")
    .max(2000, "תיאור מוצר ארוך מדי — עד 2000 תווים / Description too long — up to 2000 characters"),
  averagePrice: z
    .number()
    .positive("מחיר חייב להיות חיובי / Price must be positive")
    .max(1_000_000, "מחיר גדול מדי / Price too large"),
  salesModel: salesModelSchema,
  budgetRange: budgetRangeSchema,
  mainGoal: mainGoalSchema,
  existingChannels: z.array(channelSchema),
  experienceLevel: experienceLevelSchema,
});

export type ValidFormData = z.infer<typeof formDataSchema>;

export type ValidationResult =
  | { ok: true; data: ValidFormData }
  | { ok: false; errors: z.ZodIssue[] };

export function validateFormData(data: unknown): ValidationResult {
  const result = formDataSchema.safeParse(data);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, errors: result.error.issues };
}

export function formatZodErrors(errors: z.ZodIssue[], language: "he" | "en" = "en"): string {
  const prefix = language === "he" ? "שדות שגויים" : "Invalid fields";
  const list = errors
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join("; ");
  return `${prefix}: ${list}`;
}
