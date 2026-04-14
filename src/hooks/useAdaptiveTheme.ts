import { useEffect } from "react";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { getL5CSSVars } from "@/engine/behavioralHeuristicEngine";

/**
 * Adaptive Theme Hook
 * Sets data-attributes on <html> based on user context.
 * CSS variable overrides in index.css respond to these attributes,
 * creating a personalised visual experience per user type.
 *
 * ALL personalisation effects are gated on adaptationsEnabled === true.
 * The user must accept the ArchetypeRevealScreen before any theming fires.
 * This is the IKEA-effect transparency mechanism (Norton, Mochon & Ariely 2011).
 */
export function useAdaptiveTheme() {
  const { profile } = useUserProfile();
  const { effectiveArchetypeId, confidenceTier, uiConfig, adaptationsEnabled } = useArchetype();

  useEffect(() => {
    const el = document.documentElement;

    // Segment: new-beginner | new-intermediate | new-advanced | returning
    el.setAttribute("data-segment", profile.userSegment || "new-beginner");

    // Business field from last form data
    const field = profile.lastFormData?.businessField || "";
    if (field) {
      el.setAttribute("data-field", field);
    } else {
      el.removeAttribute("data-field");
    }

    // Audience type
    const audience = profile.lastFormData?.audienceType || "";
    if (audience) {
      el.setAttribute("data-audience", audience);
    } else {
      el.removeAttribute("data-audience");
    }

    // Experience level
    const exp = profile.lastFormData?.experienceLevel || "";
    if (exp) {
      el.setAttribute("data-experience", exp);
    } else {
      el.removeAttribute("data-experience");
    }

    return () => {
      el.removeAttribute("data-segment");
      el.removeAttribute("data-field");
      el.removeAttribute("data-audience");
      el.removeAttribute("data-experience");
    };
  }, [
    profile.userSegment,
    profile.lastFormData?.businessField,
    profile.lastFormData?.audienceType,
    profile.lastFormData?.experienceLevel,
  ]);

  // Archetype attribute: only when user has opted in AND tier is confident/strong
  useEffect(() => {
    const el = document.documentElement;
    if (adaptationsEnabled && (confidenceTier === "confident" || confidenceTier === "strong")) {
      el.setAttribute("data-archetype", effectiveArchetypeId);
    } else {
      el.removeAttribute("data-archetype");
    }
    return () => el.removeAttribute("data-archetype");
  }, [effectiveArchetypeId, confidenceTier, adaptationsEnabled]);

  // Information density: only when opted in AND strong tier
  useEffect(() => {
    const el = document.documentElement;
    if (adaptationsEnabled && confidenceTier === "strong") {
      el.setAttribute("data-density", uiConfig.informationDensity);
    } else {
      el.removeAttribute("data-density");
    }
    return () => el.removeAttribute("data-density");
  }, [uiConfig.informationDensity, confidenceTier, adaptationsEnabled]);

  // L5 CSS vars: micro-interaction tuning at "confident" and "strong" tiers.
  // Produces --motion-duration-multiplier, --motion-easing, --cta-font-weight.
  // Grounded in H1–H8 heuristics (see behavioralHeuristicEngine.ts).
  useEffect(() => {
    if (!adaptationsEnabled || (confidenceTier !== "confident" && confidenceTier !== "strong")) return;
    const el = document.documentElement;
    const vars = getL5CSSVars(effectiveArchetypeId);
    Object.entries(vars).forEach(([prop, value]) => {
      el.style.setProperty(prop, value);
    });
    return () => {
      Object.keys(vars).forEach((prop) => {
        el.style.removeProperty(prop);
      });
    };
  }, [effectiveArchetypeId, confidenceTier, adaptationsEnabled]);
}
