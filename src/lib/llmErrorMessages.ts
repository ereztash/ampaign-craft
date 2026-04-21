// Translates structured LLM error codes from Supabase edge functions
// into user-friendly Hebrew/English messages with actionable next steps.
//
// Edge functions return: { error: string, code?: LlmErrorCode, hint?: string }
// via `supabase/functions/_shared/anthropicError.ts`.

export type LlmErrorCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "rate_limited"
  | "upstream_error"
  | "unauthorized"
  | "bad_request"
  | "model_not_found"
  | "network_error"
  | "internal_error";

export interface LlmErrorPayload {
  error: string;
  code?: LlmErrorCode | string;
  hint?: string;
}

export class LlmError extends Error {
  code?: string;
  hint?: string;
  status: number;

  constructor(payload: LlmErrorPayload, status: number) {
    super(payload.error);
    this.name = "LlmError";
    this.code = payload.code;
    this.hint = payload.hint;
    this.status = status;
  }
}

const MESSAGES_HE: Record<LlmErrorCode, string> = {
  missing_api_key: "שירות ה-AI לא מוגדר (ANTHROPIC_API_KEY חסר ב-Supabase Secrets).",
  invalid_api_key: "המפתח ל-Anthropic אינו תקף. עדכן את ANTHROPIC_API_KEY ב-Supabase Secrets.",
  rate_limited: "ה-API של Anthropic מגביל אותך זמנית. המתן דקה ונסה שוב.",
  upstream_error: "שירות ה-AI של Anthropic מחזיר שגיאה. נסה שוב בעוד דקה.",
  unauthorized: "הבקשה לא מורשית. ודא שאתה מחובר ורענן את הדף.",
  bad_request: "הבקשה לא תקינה. פנה לתמיכה אם זה חוזר.",
  model_not_found: "שם המודל אינו תקף. נדרש עדכון קוד.",
  network_error: "בעיית רשת מול שירות ה-AI. בדוק חיבור לאינטרנט ונסה שוב.",
  internal_error: "שגיאה פנימית בשירות. נסה שוב.",
};

const MESSAGES_EN: Record<LlmErrorCode, string> = {
  missing_api_key: "AI service not configured (ANTHROPIC_API_KEY missing in Supabase Secrets).",
  invalid_api_key: "Invalid Anthropic API key. Update ANTHROPIC_API_KEY in Supabase Secrets.",
  rate_limited: "Anthropic is rate-limiting us. Wait a minute and try again.",
  upstream_error: "Anthropic AI service is erroring. Try again in a minute.",
  unauthorized: "Request not authorized. Ensure you're signed in and refresh.",
  bad_request: "Bad request. Contact support if this persists.",
  model_not_found: "Invalid model name. Code update required.",
  network_error: "Network issue reaching the AI service. Check your connection.",
  internal_error: "Internal service error. Please try again.",
};

export function translateLlmError(
  code: string | undefined,
  fallback: string,
  lang: "he" | "en" = "he",
): string {
  const table = lang === "he" ? MESSAGES_HE : MESSAGES_EN;
  if (code && code in table) {
    return table[code as LlmErrorCode];
  }
  return fallback;
}
