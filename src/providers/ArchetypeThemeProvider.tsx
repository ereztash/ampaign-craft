// ArchetypeThemeProvider — Phase C
//
// Reads adaptationsEnabled + effectiveArchetypeId from ArchetypeContext
// and publishes extra data-attributes on <html> for theming
// (data-shape, data-elevation, data-motion-preset).
//
// Also injects the Fraunces Google Fonts <link> when the active archetype
// is "pioneer" and adaptations are enabled. The font is used via
// --heading-font-family: 'Fraunces', ... in index.css.
//
// Font load is fire-and-forget; we rely on font-display:swap so the
// page is immediately readable with the fallback stack.

import { useEffect, type ReactNode } from "react";
import { useArchetype } from "@/contexts/ArchetypeContext";

interface ArchetypeThemeProviderProps {
  children: ReactNode;
}

export function ArchetypeThemeProvider({ children }: ArchetypeThemeProviderProps) {
  const { effectiveArchetypeId, confidenceTier, adaptationsEnabled } = useArchetype();

  useEffect(() => {
    const el = document.documentElement;

    if (!adaptationsEnabled || (confidenceTier !== "confident" && confidenceTier !== "strong")) {
      el.removeAttribute("data-shape");
      el.removeAttribute("data-elevation");
      el.removeAttribute("data-motion-preset");
      return;
    }

    // Shape preset
    const shapeMap: Record<string, string> = {
      strategist: "square",
      optimizer:  "pill",
      pioneer:    "pill",
      connector:  "pill",
      closer:     "square",
    };
    el.setAttribute("data-shape", shapeMap[effectiveArchetypeId] ?? "square");

    // Elevation preset
    const elevationMap: Record<string, string> = {
      strategist: "medium",
      optimizer:  "flat",
      pioneer:    "high",
      connector:  "low",
      closer:     "medium",
    };
    el.setAttribute("data-elevation", elevationMap[effectiveArchetypeId] ?? "medium");

    // Motion preset (consumed by framer-motion MotionConfig in Phase C)
    const motionMap: Record<string, string> = {
      strategist: "minimal",
      optimizer:  "crisp",
      pioneer:    "playful",
      connector:  "smooth",
      closer:     "sharp",
    };
    el.setAttribute("data-motion-preset", motionMap[effectiveArchetypeId] ?? "smooth");

    return () => {
      el.removeAttribute("data-shape");
      el.removeAttribute("data-elevation");
      el.removeAttribute("data-motion-preset");
    };
  }, [effectiveArchetypeId, confidenceTier, adaptationsEnabled]);

  // Pioneer font — injected only for opted-in pioneer users at confident+ tier.
  // Uses a stable id so React StrictMode double-invocation is idempotent.
  useEffect(() => {
    const FONT_LINK_ID = "archetype-pioneer-font";
    const wantFont =
      adaptationsEnabled &&
      effectiveArchetypeId === "pioneer" &&
      (confidenceTier === "confident" || confidenceTier === "strong");

    if (wantFont) {
      if (!document.getElementById(FONT_LINK_ID)) {
        const link = document.createElement("link");
        link.id = FONT_LINK_ID;
        link.rel = "stylesheet";
        link.href =
          "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap";
        document.head.appendChild(link);
      }
    } else {
      document.getElementById(FONT_LINK_ID)?.remove();
    }

    return () => {
      document.getElementById(FONT_LINK_ID)?.remove();
    };
  }, [effectiveArchetypeId, confidenceTier, adaptationsEnabled]);

  return <>{children}</>;
}
