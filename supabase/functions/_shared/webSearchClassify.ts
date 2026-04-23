// Lightweight classification of web-search results coming from Anthropic's
// web_search_20250305 tool. Runs inline in ai-coach (no extra round trip),
// attaches reliability/domain/language so the vector store has richer
// metadata for filtered similarity search later.

export type Reliability = "high" | "medium" | "low";

export function domainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

// Heuristic, deliberately coarse. Israeli government and academic sources are
// treated as high; major outlets and wikipedia as medium; everything else or
// unparseable URLs drop to low.
export function classifyReliability(url: string): Reliability {
  const domain = domainFromUrl(url);
  if (!domain) return "low";
  if (domain.endsWith(".gov.il") || domain.endsWith(".gov") || domain === "gov.il") return "high";
  if (domain.endsWith(".ac.il") || domain.endsWith(".edu")) return "high";
  if (domain.endsWith("wikipedia.org")) return "medium";
  if (/(haaretz|ynet|walla|calcalist|themarker|globes|mako|maariv|bbc|reuters|nytimes|bloomberg|ft|wsj)\./.test(domain)) return "medium";
  if (/(blog|forum|reddit|medium\.com|substack)/.test(domain)) return "low";
  return "medium";
}

export function detectLanguage(text: string): "he" | "en" | "mixed" {
  const hebrew = /[֐-׿]/.test(text);
  const english = /[a-zA-Z]{3,}/.test(text);
  if (hebrew && english) return "mixed";
  if (hebrew) return "he";
  return "en";
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
