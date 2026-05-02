// ─── User-Profile ViewModel ──────────────────────────────────────────────────
// Bridges discProfileEngine, nextStepEngine, churnPredictionEngine → UI props.

import type { DISCProfile } from "@/engine/discProfileEngine";
import type { NextStep } from "@/engine/nextStepEngine";
import type {
  ChurnRiskAssessment,
  ChurnIntervention,
} from "@/engine/churnPredictionEngine";
import type { BilingualText } from "@/types/i18n";

// ── DISCProfileVM ─────────────────────────────────────────────────────────────

export type DISCDimension = "D" | "I" | "S" | "C";

export interface DISCProfileVM {
  primary: DISCDimension;
  secondary: DISCDimension;
  distribution: Record<DISCDimension, number>;
  emphasize: BilingualText[];
  avoid: BilingualText[];
  ctaStyle: BilingualText;
  communicationTone: BilingualText;
  funnelEmphasis: string;
}

export function toDISCProfileVM(profile: DISCProfile): DISCProfileVM {
  return {
    primary: profile.primary,
    secondary: profile.secondary,
    distribution: profile.distribution,
    emphasize: profile.messagingStrategy.emphasize,
    avoid: profile.messagingStrategy.avoid,
    ctaStyle: profile.ctaStyle,
    communicationTone: profile.communicationTone,
    funnelEmphasis: profile.funnelEmphasis,
  };
}

// ── NextStepVM ────────────────────────────────────────────────────────────────

export interface NextStepVM {
  id: string;
  title: BilingualText;
  description: BilingualText;
  route: string;
  icon: string;
  color: string;
}

export function toNextStepVM(step: NextStep): NextStepVM {
  return {
    id: step.id,
    title: step.title,
    description: step.description,
    route: step.route,
    icon: step.icon,
    color: step.color,
  };
}

// ── ChurnRiskVM ───────────────────────────────────────────────────────────────

export interface ChurnInterventionVM {
  stage: number;
  stageName: BilingualText;
  action: BilingualText;
  channel: string;
  timing: string;
  template: BilingualText;
}

export interface ChurnRiskVM {
  riskScore: number;
  riskTier: "healthy" | "watch" | "at-risk" | "critical";
  topInterventions: ChurnInterventionVM[];
  nrrProjection: { current: number; withIntervention: number };
  retentionPlaybook: BilingualText[];
}

export function toChurnRiskVM(assessment: ChurnRiskAssessment): ChurnRiskVM {
  return {
    riskScore: assessment.riskScore,
    riskTier: assessment.riskTier,
    topInterventions: assessment.interventions.slice(0, 3).map(
      (iv: ChurnIntervention): ChurnInterventionVM => ({
        stage: iv.stage,
        stageName: iv.stageName,
        action: iv.action,
        channel: iv.channel,
        timing: iv.timing,
        template: iv.template,
      }),
    ),
    nrrProjection: assessment.nrrProjection,
    retentionPlaybook: assessment.retentionPlaybook,
  };
}
