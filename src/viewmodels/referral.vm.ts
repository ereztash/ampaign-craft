// Referral boundary: re-exports from referralEngine.

export type {
  ReferralData,
  ReferralRecord,
  ReferralReward,
} from "@/engine/referralEngine";

export {
  REFERRAL_REWARDS,
  generateReferralCode,
  getReferralData,
  recordReferral,
  markReferralConverted,
  getReferralLink,
  getReferralStats,
} from "@/engine/referralEngine";
