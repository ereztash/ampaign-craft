import { useEffect } from "react";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useArchetype } from "@/contexts/ArchetypeContext";

/**
 * Adaptive Theme Hook
 * Sets data-attributes on <html> based on user context.
 * CSS variable overrides in index.css respond to these attributes,
 * creating a personalized visual experience per user type.
 */
export function useAdaptiveTheme() {
  const { profile } = useUserProfile();
  const { effectiveArchetypeId, confidenceTier, uiConfig } = useArchetype();

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

  // Archetype attribute: set at "confident" and "strong" tiers
  useEffect(() => {
    const el = document.documentElement;
    if (confidenceTier === "confident" || confidenceTier === "strong") {
      el.setAttribute("data-archetype", effectiveArchetypeId);
    } else {
      el.removeAttribute("data-archetype");
    }
    return () => el.removeAttribute("data-archetype");
  }, [effectiveArchetypeId, confidenceTier]);

  // Information density: only at "strong" tier
  useEffect(() => {
    const el = document.documentElement;
    if (confidenceTier === "strong") {
      el.setAttribute("data-density", uiConfig.informationDensity);
    } else {
      el.removeAttribute("data-density");
    }
    return () => el.removeAttribute("data-density");
  }, [uiConfig.informationDensity, confidenceTier]);
}
