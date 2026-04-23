// Sentry event + breadcrumb scrubbing. Runs in the browser before each
// event is dispatched to Sentry, so anything we miss here will be visible
// to anyone with Sentry access. We strip:
//   - Authorization / Cookie / X-API-Key / Api-Key headers
//   - access_token, refresh_token, token, password, secret query params
//   - event.request.data (covers POST bodies)
//   - breadcrumb data values containing any of the same secret keys

const SECRET_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "x-api-key",
  "api-key",
  "apikey",
  "x-supabase-auth",
]);

const SECRET_KEY_RE = /(access_?token|refresh_?token|id_?token|password|secret|api[-_]?key|bearer|session)/i;

const REDACTED = "[redacted]";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function scrubHeaders(headers: unknown): unknown {
  if (!isPlainObject(headers)) return headers;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SECRET_HEADER_NAMES.has(k.toLowerCase()) ? REDACTED : v;
  }
  return out;
}

function scrubQueryString(qs: unknown): unknown {
  if (typeof qs !== "string" || !qs) return qs;
  try {
    const params = new URLSearchParams(qs.startsWith("?") ? qs.slice(1) : qs);
    let touched = false;
    for (const key of [...params.keys()]) {
      if (SECRET_KEY_RE.test(key)) {
        params.set(key, REDACTED);
        touched = true;
      }
    }
    return touched ? (qs.startsWith("?") ? "?" : "") + params.toString() : qs;
  } catch {
    return qs;
  }
}

function scrubUrl(url: unknown): unknown {
  if (typeof url !== "string") return url;
  const idx = url.indexOf("?");
  if (idx === -1) return url;
  const base = url.slice(0, idx);
  const scrubbed = scrubQueryString(url.slice(idx + 1));
  return `${base}?${scrubbed}`;
}

function scrubObjectKeys(obj: unknown): unknown {
  if (!isPlainObject(obj)) return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = SECRET_KEY_RE.test(k) ? REDACTED : v;
  }
  return out;
}

export function scrubSentryEvent(event: Record<string, unknown>): Record<string, unknown> {
  const req = event.request as Record<string, unknown> | undefined;
  if (req) {
    delete req.data;
    req.headers = scrubHeaders(req.headers);
    req.cookies = REDACTED;
    req.query_string = scrubQueryString(req.query_string);
    req.url = scrubUrl(req.url);
  }
  if (event.extra) event.extra = scrubObjectKeys(event.extra);
  if (event.contexts) event.contexts = scrubObjectKeys(event.contexts);
  return event;
}

export function scrubSentryBreadcrumb(
  breadcrumb: Record<string, unknown>,
): Record<string, unknown> {
  const data = breadcrumb.data as Record<string, unknown> | undefined;
  if (data) {
    breadcrumb.data = scrubObjectKeys(data);
  }
  if (typeof breadcrumb.message === "string") {
    // Strip long tokens that leaked into log messages.
    breadcrumb.message = breadcrumb.message.replace(/Bearer\s+[A-Za-z0-9._-]{20,}/g, "Bearer [redacted]");
  }
  return breadcrumb;
}
