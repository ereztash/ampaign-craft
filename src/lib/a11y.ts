// ═══════════════════════════════════════════════
// a11y — Accessibility helpers
//
// Centralised utilities for ARIA attributes so components don't
// each invent their own pattern. All helpers return plain props
// objects that spread directly onto JSX elements.
//
// WCAG 2.1 AA target.
// ═══════════════════════════════════════════════

/** Attach to any element that should announce changes to screen readers. */
export const livePolite  = { "aria-live": "polite",    "aria-atomic": "true" } as const;
export const liveAssert  = { "aria-live": "assertive", "aria-atomic": "true" } as const;

/** Mark a decorative element so screen readers skip it. */
export const decorative  = { "aria-hidden": true } as const;

/**
 * Build aria props for an icon-only button.
 *
 * @example
 * <Button {...iconBtn("Close dialog", language)}>
 *   <X className="h-4 w-4" aria-hidden />
 * </Button>
 */
export function iconBtn(
  label: { he: string; en: string } | string,
  lang?: "he" | "en",
): { "aria-label": string } {
  if (typeof label === "string") return { "aria-label": label };
  return { "aria-label": label[lang ?? "en"] };
}

/**
 * Props for a single radio-card button inside a radiogroup.
 *
 * @example
 * <button {...radioCard(isSelected, "Pro plan")} onClick={…}>…</button>
 */
export function radioCard(
  checked: boolean,
  label?: string,
): { role: "radio"; "aria-checked": boolean; "aria-label"?: string } {
  return {
    role:          "radio",
    "aria-checked": checked,
    ...(label ? { "aria-label": label } : {}),
  };
}

/**
 * Props for the wrapper of a group of radio cards.
 * Pass the id of the element that labels the group.
 *
 * @example
 * <div {...radioGroup("step-title")} className="grid gap-3">…</div>
 */
export function radioGroup(
  labelledBy?: string,
): { role: "radiogroup"; "aria-labelledby"?: string } {
  return {
    role: "radiogroup",
    ...(labelledBy ? { "aria-labelledby": labelledBy } : {}),
  };
}

/**
 * Props for a checkbox-style toggle button (multi-select cards).
 */
export function checkboxCard(
  checked: boolean,
  label?: string,
): { role: "checkbox"; "aria-checked": boolean; "aria-label"?: string } {
  return {
    role:           "checkbox",
    "aria-checked":  checked,
    ...(label ? { "aria-label": label } : {}),
  };
}

/**
 * Props for a progress bar element.
 *
 * @example
 * <div {...progressBar(33, 0, 100, "Step 2 of 6")} className="…" />
 */
export function progressBar(
  value: number,
  min = 0,
  max = 100,
  label?: string,
): {
  role: "progressbar";
  "aria-valuenow": number;
  "aria-valuemin": number;
  "aria-valuemax": number;
  "aria-label"?: string;
} {
  return {
    role:             "progressbar",
    "aria-valuenow":   value,
    "aria-valuemin":   min,
    "aria-valuemax":   max,
    ...(label ? { "aria-label": label } : {}),
  };
}

/**
 * Generate a stable id for associating label ↔ input when htmlFor
 * isn't directly applicable (e.g. Radix-wrapped inputs).
 */
export function fieldId(name: string): string {
  return `field-${name.replace(/\s+/g, "-").toLowerCase()}`;
}
