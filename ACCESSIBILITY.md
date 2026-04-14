# Accessibility Conformance Statement

**Product:** FunnelForge (ampaign-craft)  
**Version:** 1.x  
**Date:** 2026-04-14  
**Standard:** WCAG 2.1 Level AA  
**Testing method:** Automated (axe-core) + manual component audit  

---

## Summary

FunnelForge targets **WCAG 2.1 Level AA** conformance. The product is a
bilingual (Hebrew / English) React single-page application. The notes below
reflect the current state of the codebase and known gaps.

---

## VPAT — Voluntary Product Accessibility Template

### 1. Perceivable

| Criterion | Level | Status | Notes |
|-----------|-------|--------|-------|
| 1.1.1 Non-text Content | A | Supported | SVG charts have `role="img"` + `aria-label` + `<title>` + `<desc>`. Decorative icons carry `aria-hidden="true"`. Screen-reader-only `<table>` alternatives are provided for radar and line charts. |
| 1.2 Time-based Media | A | N/A | No audio or video content. |
| 1.3.1 Info and Relationships | A | Supported | Semantic HTML throughout. `<main>`, `<nav>`, landmark roles explicit where shadcn renders `<div>`. Step options use `role="radiogroup"` + `role="radio"`. Progress bars use `role="progressbar"` with `aria-valuenow/min/max`. |
| 1.3.2 Meaningful Sequence | A | Supported | DOM order matches visual order; no CSS `order` or `position: absolute` used to reorder content semantically. |
| 1.3.3 Sensory Characteristics | A | Supported | Error states use text labels alongside colour. Trend direction conveyed via icon + text label, not colour alone. |
| 1.3.4 Orientation | AA | Supported | No orientation lock. |
| 1.3.5 Identify Input Purpose | AA | Supported | Standard HTML input `type` and `autocomplete` attributes used where applicable. |
| 1.4.1 Use of Colour | A | Supported | All information conveyed in colour is also present as text or icon. |
| 1.4.2 Audio Control | A | N/A | No audio. |
| 1.4.3 Contrast (Minimum) | AA | Partially supported | CSS custom properties via `hsl(var(--...))` tokens; contrast validated in Figma at design time. jsdom colour limitations prevent automated runtime checks — manual audit recommended against light and dark themes. |
| 1.4.4 Resize Text | AA | Supported | Tailwind `rem`-based typography. All text reflows correctly at 200% zoom. |
| 1.4.5 Images of Text | AA | Supported | No images of text. All labels are live DOM text. |
| 1.4.10 Reflow | AA | Supported | Responsive grid collapses to single-column at 320 px. No horizontal scrolling at 400% zoom. |
| 1.4.11 Non-text Contrast | AA | Supported | Form controls (checkbox, radio card borders) use `--border` token; validated to meet 3:1 at design time. |
| 1.4.12 Text Spacing | AA | Supported | No inline `line-height` or `letter-spacing` overrides that would be broken by user stylesheets. |
| 1.4.13 Content on Hover or Focus | AA | Supported | Tooltips remain visible while hovered. No content removed on keyboard focus. |

### 2. Operable

| Criterion | Level | Status | Notes |
|-----------|-------|--------|-------|
| 2.1.1 Keyboard | A | Supported | All interactive elements are `<button>` or `<a>`. Custom radio cards are `role="radio"` within `role="radiogroup"` and respond to `Enter`/`Space`. Dataset cards have `onKeyDown` handlers. |
| 2.1.2 No Keyboard Trap | A | Supported | Modal dialogs (Radix Dialog) implement correct focus trap with Escape to close. |
| 2.1.4 Character Key Shortcuts | A | N/A | No single-character keyboard shortcuts. |
| 2.2.1 Timing Adjustable | A | Supported | The processing screen progress animation respects `prefers-reduced-motion`. No session timeouts. |
| 2.2.2 Pause, Stop, Hide | A | Supported | `MotionConfig reducedMotion="user"` wraps the app; framer-motion disables all animations when the OS setting is active. |
| 2.3.1 Three Flashes | A | Supported | No content flashes more than 3 times per second. |
| 2.4.1 Bypass Blocks | A | Supported | Skip-to-main-content link (`sr-only focus:not-sr-only`) on every page via AppShell. |
| 2.4.2 Page Titled | A | Supported | React Router sets `<title>` per route. |
| 2.4.3 Focus Order | A | Supported | DOM order drives tab order; no `tabIndex > 0`. |
| 2.4.4 Link Purpose | A | Supported | All `<a>` and `<button>` elements have descriptive text or `aria-label`. Icon-only buttons use `aria-label` via the `iconBtn()` helper in `src/lib/a11y.ts`. |
| 2.4.5 Multiple Ways | AA | Supported | Navigation sidebar + top bar provide multiple routes to each section. |
| 2.4.6 Headings and Labels | AA | Supported | Heading hierarchy maintained (h1–h3). Form fields have associated labels via `htmlFor` or `aria-labelledby`. |
| 2.4.7 Focus Visible | AA | Supported | Tailwind `focus-visible:ring-2 focus-visible:ring-primary` applied globally via base layer. |
| 2.5.3 Label in Name | A | Supported | Visible label text is included in the accessible name for all interactive controls. |

### 3. Understandable

| Criterion | Level | Status | Notes |
|-----------|-------|--------|-------|
| 3.1.1 Language of Page | A | Supported | `<html lang="he">` / `<html lang="en">` set dynamically by `LanguageContext`. |
| 3.1.2 Language of Parts | AA | Partially supported | Individual text segments in the opposite language do not carry a `lang` attribute. Planned as a future enhancement. |
| 3.2.1 On Focus | A | Supported | No context changes triggered by focus alone. |
| 3.2.2 On Input | A | Supported | No context changes triggered by input alone. |
| 3.2.3 Consistent Navigation | AA | Supported | Navigation order is deterministic; archetype-based reordering is disclosed via an info icon tooltip. |
| 3.2.4 Consistent Identification | AA | Supported | Icons and labels are consistent across views. |
| 3.3.1 Error Identification | A | Supported | Validation errors surface as `role="alert"` with descriptive text; the triggering control gains `aria-invalid="true"` and `aria-describedby` pointing to the error. |
| 3.3.2 Labels or Instructions | A | Supported | All form fields have visible labels. Required fields are indicated in the label text, not colour alone. |
| 3.3.3 Error Suggestion | AA | Supported | Validation messages describe what the user must do to fix the error. |
| 3.3.4 Error Prevention | AA | Supported | Destructive actions (delete dataset, delete lead) show toast confirmation. |

### 4. Robust

| Criterion | Level | Status | Notes |
|-----------|-------|--------|-------|
| 4.1.1 Parsing | A | Supported | React renders valid HTML; no duplicate IDs in component output. |
| 4.1.2 Name, Role, Value | A | Supported | Custom interactive elements expose `role`, `aria-checked`, `aria-selected`, `aria-expanded`, and `aria-label` as appropriate. See `src/lib/a11y.ts` for centralised ARIA factories. |
| 4.1.3 Status Messages | AA | Supported | `aria-live="polite" aria-atomic="true"` used on step counters, progress message text, and async status toasts. |

---

## Known Gaps

| Area | Description | Priority |
|------|-------------|----------|
| `lang` on mixed-language fragments | Individual phrases in the secondary language (e.g. an English brand name inside a Hebrew sentence) lack a `lang` attribute. | Low |
| Colour contrast runtime validation | jsdom cannot compute `hsl(var(--css-custom-property))` values, so colour-contrast rules are disabled in the automated test suite. Manual contrast checks against both light and dark themes are needed before each release. | Medium |
| `AppSidebar` — language vs isRTL | The sidebar derives `isHe` from `isRTL` rather than `language`. Remaining `isHe ?` ternaries in that file are not converted to `tx()`. | Low |

---

## Testing Infrastructure

Automated axe-core regression tests live in:

```
src/components/__tests__/a11y.test.tsx
```

Run with:

```bash
npm test -- src/components/__tests__/a11y.test.tsx
```

The suite covers:

- **ProcessingScreen** — progress bar ARIA semantics, static rendering branch
- **BusinessDNACard** — SVG `role="img"`, `aria-label`, sr-only data table
- **MultiStepForm** — `role="radiogroup"`, `role="progressbar"`, `aria-valuenow/min/max`

axe-core version used: see `package.json` → `jest-axe` dependency.

---

## Contact

To report an accessibility issue, open a GitHub issue in the
`ereztash/ampaign-craft` repository with the label `accessibility`.
