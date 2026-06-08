import { useEffect } from "react";

interface SeoOptions {
  /** Document title for this route. */
  title: string;
  /** Optional meta description override for this route. */
  description?: string;
}

/**
 * Lightweight per-route SEO.
 *
 * The app is a client-rendered SPA served from a single static index.html, so
 * every route otherwise shares the same <title> and description. This hook
 * updates them on mount and restores the previous values on unmount, giving
 * each public route a unique title/description.
 *
 * Scope note: this helps crawlers that execute JavaScript (e.g. Googlebot).
 * Non-JS crawlers (many social and AI/LLM bots) only see the static index.html
 * head until the public pages are prerendered. Prerendering is the real fix for
 * those; this hook is the low-regret step in the meantime.
 */
export function useSeo({ title, description }: SeoOptions): void {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    let metaDesc: HTMLMetaElement | null = null;
    let prevDesc: string | null = null;
    if (description) {
      metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (metaDesc) {
        prevDesc = metaDesc.getAttribute("content");
        metaDesc.setAttribute("content", description);
      }
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc !== null) metaDesc.setAttribute("content", prevDesc);
    };
  }, [title, description]);
}
