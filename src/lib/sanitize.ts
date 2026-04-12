// ═══════════════════════════════════════════════
// HTML Sanitization — Strips dangerous tags/attributes
// Lightweight implementation without external dependencies.
// For rendering user-supplied or LLM-generated HTML safely.
// ═══════════════════════════════════════════════

const DANGEROUS_TAG_PAIRS = /<\s*(script|iframe|object|embed|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DANGEROUS_TAGS = /(<\s*\/?\s*(script|iframe|object|embed|form|input|textarea|button|link|style|meta|base)[^>]*>)/gi;
const EVENT_HANDLERS = /\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi;
const JAVASCRIPT_URLS = /(href|src|action)\s*=\s*["']?\s*javascript\s*:/gi;
const DATA_URLS = /(href|src)\s*=\s*["']?\s*data\s*:[^"'\s>]*(text\/html|application\/xhtml)/gi;

/**
 * Sanitize an HTML string by removing dangerous elements.
 * Strips: <script>, <iframe>, <object>, <embed>, <form>, <input>,
 * event handlers (onclick, onerror, etc.), javascript: URLs, data: URLs.
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty || typeof dirty !== "string") return "";

  let clean = dirty;

  // Remove dangerous tag pairs (with content between them)
  clean = clean.replace(DANGEROUS_TAG_PAIRS, "");

  // Remove any remaining dangerous self-closing or orphan tags
  clean = clean.replace(DANGEROUS_TAGS, "");

  // Remove event handlers
  clean = clean.replace(EVENT_HANDLERS, "");

  // Remove javascript: URLs
  clean = clean.replace(JAVASCRIPT_URLS, "$1=\"\"");

  // Remove dangerous data: URLs
  clean = clean.replace(DATA_URLS, "$1=\"\"");

  return clean;
}

/**
 * Escape HTML entities for safe text rendering.
 * Use when embedding user text in HTML without allowing any tags.
 */
export function escapeHTML(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
