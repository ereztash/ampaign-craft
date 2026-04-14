// ArchetypeThemeProvider — Phase A scaffold
//
// Reads adaptationsEnabled + effectiveArchetypeId from ArchetypeContext
// and publishes extra data-attributes on <html> for Phase B/C theming
// (data-shape, data-elevation, data-motion-preset).
//
// Phase C will also inject the Pioneer font <link> here. For now it only
// wires the attributes so CSS token blocks in index.css can respond.

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

  return <>{children}</>;
}
