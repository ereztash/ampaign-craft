// Shared Anthropic error classifier for Supabase Edge Functions.
//
// Normalizes Anthropic API errors + local configuration errors into a single
// structured payload that frontends can translate into actionable user messages:
//
//   { error: string, code: ErrorCode, hint: string, status: number }
//
// Backward-compatible: the `error` field is always populated so existing
// callers that read `data.error` continue to work. `code` and `hint` are additive.

export type ErrorCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "rate_limited"
  | "upstream_error"
  | "unauthorized"
  | "bad_request"
  | "model_not_found"
  | "network_error"
  | "internal_error";

export interface ClassifiedError {
  error: string;
  code: ErrorCode;
  hint: string;
  status: number;
}

const HINTS: Record<ErrorCode, string> = {
  missing_api_key: "הגדר את ANTHROPIC_API_KEY ב-Supabase Dashboard → Edge Functions → Secrets.",
  invalid_api_key: "בדוק שהמפתח ANTHROPIC_API_KEY תקף ופעיל ב-Supabase Secrets.",
  rate_limited: "ה-API של Anthropic מגביל אותך זמנית. המתן דקה ונסה שוב.",
  upstream_error: "Anthropic מחזיר שגיאה. נסה שוב בעוד דקה או בדוק ב-status.anthropic.com.",
  unauthorized: "הבקשה לא מורשית. ודא שאתה מחובר.",
  bad_request: "הבקשה לא תקינה. פנה לתמיכה עם פרטי השגיאה.",
  model_not_found: "שם המודל אינו תקף או הוצא משימוש. עדכן את ה-model ID בקוד.",
  network_error: "בעיית רשת מול Anthropic. בדוק חיבור אינטרנט ו-status.anthropic.com.",
  internal_error: "שגיאה פנימית. נסה שוב. אם זה נמשך, פנה לתמיכה.",
};

export function classifyAnthropicError(response: Response, data: unknown): ClassifiedError {
  const status = response.status;
  const errObj = (data as { error?: { type?: string; message?: string } } | undefined)?.error;
  const errType = errObj?.type ?? "";
  const errMsg = errObj?.message ?? "";

  let code: ErrorCode = "upstream_error";

  if (status === 401 || errType === "authentication_error") {
    code = "invalid_api_key";
  } else if (status === 403 || errType === "permission_error") {
    code = "unauthorized";
  } else if (status === 429 || errType === "rate_limit_error") {
    code = "rate_limited";
  } else if ((status === 400 || status === 404) && /model|not[_ ]found/i.test(errType + errMsg)) {
    code = "model_not_found";
  } else if (status >= 400 && status < 500) {
    code = "bad_request";
  }

  const message = errMsg || `Anthropic API error (${status})`;
  return { error: message, code, hint: HINTS[code], status };
}

export function missingApiKeyError(): ClassifiedError {
  return {
    error: "ANTHROPIC_API_KEY not configured",
    code: "missing_api_key",
    hint: HINTS.missing_api_key,
    status: 500,
  };
}

export function unauthorizedError(): ClassifiedError {
  return {
    error: "Unauthorized",
    code: "unauthorized",
    hint: HINTS.unauthorized,
    status: 401,
  };
}

export function networkError(err: unknown): ClassifiedError {
  return {
    error: String(err),
    code: "network_error",
    hint: HINTS.network_error,
    status: 502,
  };
}

export function internalError(err: unknown): ClassifiedError {
  return {
    error: String(err),
    code: "internal_error",
    hint: HINTS.internal_error,
    status: 500,
  };
}

export function errorResponse(classified: ClassifiedError, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: classified.error, code: classified.code, hint: classified.hint }),
    {
      status: classified.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
