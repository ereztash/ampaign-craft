// ViewModel adapter for the prospectIntelligence engine.
// Components import ProspectProfile and related functions from here,
// never directly from @/engine/prospectIntelligence.

export type {
  FoggLeg,
  ProspectProfile,
} from "@/engine/prospectIntelligence";

export {
  triggerProspectResearch,
  getProspectProfile,
  clearProspectProfile,
} from "@/engine/prospectIntelligence";
