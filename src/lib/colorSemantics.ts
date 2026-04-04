/**
 * Visual Storytelling Color System
 *
 * Maps neurochemical vectors to CSS color variables, creating a semantic
 * color language that extends across the entire UI.
 *
 * Cortisol (red/destructive) → tension, urgency, stakes, critical
 * Oxytocin (blue/primary)    → trust, connection, safety, stability
 * Dopamine (green/accent)    → reward, growth, progress, achievement
 * Insight (purple/chart-4)   → insights, AI recommendations
 * Opportunity (orange/chart-3) → opportunities, calls to action
 */

// ═══════════════════════════════════════════════
// Semantic Color Mapping
// ═══════════════════════════════════════════════

export const colorSemantics = {
  tension: "destructive",
  trust: "primary",
  reward: "accent",
  insight: "chart-4",
  opportunity: "chart-3",
  neutral: "muted",
} as const;

export type SemanticColor = keyof typeof colorSemantics;

// ═══════════════════════════════════════════════
// Neuro-Vector Color Classes
// ═══════════════════════════════════════════════

export const neuroVectorColors = {
  cortisol: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    badge: "bg-destructive text-destructive-foreground",
    gradient: "from-destructive/20 to-destructive/5",
  },
  oxytocin: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/30",
    badge: "bg-primary text-primary-foreground",
    gradient: "from-primary/20 to-primary/5",
  },
  dopamine: {
    bg: "bg-accent/20",
    text: "text-accent-foreground",
    border: "border-accent/30",
    badge: "bg-accent text-accent-foreground",
    gradient: "from-accent/20 to-accent/5",
  },
} as const;

// ═══════════════════════════════════════════════
// Funnel Stage Colors
// ═══════════════════════════════════════════════

export const funnelStageColors: Record<string, {
  border: string;
  bg: string;
  text: string;
  label: string;
  gradient: string; // CSS gradient for funnel visualization
}> = {
  awareness: {
    border: "border-l-destructive",
    bg: "bg-destructive/5",
    text: "text-destructive",
    label: "cortisol",
    gradient: "linear-gradient(135deg, hsl(var(--destructive)), hsl(var(--chart-3)))",
  },
  engagement: {
    border: "border-l-primary",
    bg: "bg-primary/5",
    text: "text-primary",
    label: "oxytocin",
    gradient: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--chart-4)))",
  },
  leads: {
    border: "border-l-[hsl(var(--chart-3))]",
    bg: "bg-[hsl(var(--chart-3))]/5",
    text: "text-[hsl(var(--chart-3))]",
    label: "opportunity",
    gradient: "linear-gradient(135deg, hsl(var(--chart-3)), hsl(var(--accent)))",
  },
  conversion: {
    border: "border-l-accent",
    bg: "bg-accent/5",
    text: "text-accent-foreground",
    label: "dopamine",
    gradient: "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--primary)))",
  },
  retention: {
    border: "border-l-primary",
    bg: "bg-primary/5",
    text: "text-primary",
    label: "oxytocin",
    gradient: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
  },
};

// ═══════════════════════════════════════════════
// KPI & Status Colors
// ═══════════════════════════════════════════════

export function getKpiStatusColor(status: "good" | "warning" | "critical") {
  switch (status) {
    case "good":
      return {
        bg: "bg-accent/10",
        text: "text-accent-foreground",
        border: "border-accent/30",
        dot: "bg-accent",
      };
    case "warning":
      return {
        bg: "bg-[hsl(var(--chart-3))]/10",
        text: "text-[hsl(var(--chart-3))]",
        border: "border-[hsl(var(--chart-3))]/30",
        dot: "bg-[hsl(var(--chart-3))]",
      };
    case "critical":
      return {
        bg: "bg-destructive/10",
        text: "text-destructive",
        border: "border-destructive/30",
        dot: "bg-destructive",
      };
  }
}

// ═══════════════════════════════════════════════
// Trend Colors
// ═══════════════════════════════════════════════

export function getTrendColor(direction: "up" | "down" | "stable", isPositiveMetric: boolean) {
  if (direction === "stable") {
    return { text: "text-primary", icon: "text-primary", bg: "bg-primary/10" };
  }

  const isGood = (direction === "up" && isPositiveMetric) || (direction === "down" && !isPositiveMetric);

  if (isGood) {
    return { text: "text-accent-foreground", icon: "text-accent", bg: "bg-accent/10" };
  }
  return { text: "text-destructive", icon: "text-destructive", bg: "bg-destructive/10" };
}

// ═══════════════════════════════════════════════
// Brand Diagnostic Tier Colors
// ═══════════════════════════════════════════════

export function getDiagnosticTierColor(tier: "strong" | "gaps" | "pivot" | "restart") {
  switch (tier) {
    case "strong":
      return { bg: "bg-accent/10", text: "text-accent-foreground", border: "border-accent/30", badge: "bg-accent" };
    case "gaps":
      return { bg: "bg-[hsl(var(--chart-3))]/10", text: "text-[hsl(var(--chart-3))]", border: "border-[hsl(var(--chart-3))]/30", badge: "bg-[hsl(var(--chart-3))]" };
    case "pivot":
      return { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30", badge: "bg-destructive" };
    case "restart":
      return { bg: "bg-destructive/15", text: "text-destructive", border: "border-destructive/50", badge: "bg-destructive" };
  }
}

// ═══════════════════════════════════════════════
// Reader Profile Colors (CopyLab)
// ═══════════════════════════════════════════════

export function getReaderProfileColor(level: number) {
  if (level <= 2) {
    // System 1 — emotional → cortisol/warm
    return { border: "border-l-destructive", bg: "bg-destructive/5" };
  }
  if (level >= 4) {
    // System 2 — analytical → oxytocin/cool
    return { border: "border-l-primary", bg: "bg-primary/5" };
  }
  // Balanced → dopamine/reward
  return { border: "border-l-accent", bg: "bg-accent/5" };
}

// ═══════════════════════════════════════════════
// Progress Bar Neuro-Spectrum Colors
// ═══════════════════════════════════════════════

export function getProgressColor(currentStep: number, totalSteps: number) {
  const progress = currentStep / totalSteps;
  if (progress <= 0.33) {
    return "bg-primary"; // Trust phase (oxytocin/blue)
  }
  if (progress <= 0.66) {
    return "bg-[hsl(var(--chart-3))]"; // Opportunity phase (orange)
  }
  return "bg-accent"; // Reward phase (dopamine/green)
}

// ═══════════════════════════════════════════════
// Recharts Color Palette (semantic order)
// ═══════════════════════════════════════════════

export const chartColorPalette = [
  "hsl(var(--primary))",      // Trust/blue
  "hsl(var(--accent))",       // Reward/green
  "hsl(var(--chart-3))",      // Opportunity/orange
  "hsl(var(--chart-4))",      // Insight/purple
  "hsl(var(--destructive))",  // Tension/red
];

// Dataset health color based on 0-100 score
export function getDatasetHealthColor(score: number) {
  if (score >= 75) return { text: "text-accent-foreground", bg: "bg-accent/10", label: "healthy" };
  if (score >= 50) return { text: "text-[hsl(var(--chart-3))]", bg: "bg-[hsl(var(--chart-3))]/10", label: "attention" };
  return { text: "text-destructive", bg: "bg-destructive/10", label: "critical" };
}
