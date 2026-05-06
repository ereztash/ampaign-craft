// Referral engine boundary: re-exports types and functions that components need.
// Components must import from here, never from @/engine/* directly.

export { REFERRAL_REWARDS, getReferralData, getReferralLink, getReferralStats } from "@/engine/referralEngine";
