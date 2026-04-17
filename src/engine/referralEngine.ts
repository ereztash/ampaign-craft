// ═══════════════════════════════════════════════
// FunnelForge Referral Engine
// Manages self-referral program for product-led growth.
// Reward: referrer → +1 month Pro trial, referee → 14-day Pro trial.
// ═══════════════════════════════════════════════

const REFERRAL_KEY = "funnelforge-referral";

export interface ReferralData {
  code: string;
  userId: string;
  createdAt: string;
  referrals: ReferralRecord[];
}

export interface ReferralRecord {
  refereeEmail: string;
  convertedAt: string | null;
  rewardClaimed: boolean;
}

export interface ReferralReward {
  type: "pro_trial";
  durationDays: number;
  forRole: "referrer" | "referee";
}

export const REFERRAL_REWARDS: Record<string, ReferralReward> = {
  referrer: { type: "pro_trial", durationDays: 30, forRole: "referrer" },
  referee: { type: "pro_trial", durationDays: 14, forRole: "referee" },
};

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i);
    h &= h;
  }
  return Math.abs(h);
}

/**
 * Generate a deterministic referral code from userId (no Date.now — safe in tests).
 */
export function generateReferralCode(userId: string): string {
  const prefix = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).padEnd(4, "X");
  const hash = djb2(userId).toString(36).padStart(4, "0").slice(-4);
  return (prefix + hash).toUpperCase();
}

/**
 * Get or create referral data for a user.
 */
export function getReferralData(userId: string): ReferralData {
  try {
    const raw = localStorage.getItem(REFERRAL_KEY);
    if (raw) {
      const data = JSON.parse(raw) as ReferralData;
      if (data.userId === userId) return data;
    }
  } catch { /* continue to create new */ }

  const data: ReferralData = {
    code: generateReferralCode(userId),
    userId,
    createdAt: new Date().toISOString(),
    referrals: [],
  };

  localStorage.setItem(REFERRAL_KEY, JSON.stringify(data));
  return data;
}

/**
 * Record a new referral.
 */
export function recordReferral(userId: string, refereeEmail: string): ReferralData {
  const data = getReferralData(userId);

  // Don't duplicate
  if (data.referrals.some((r) => r.refereeEmail === refereeEmail)) {
    return data;
  }

  data.referrals.push({
    refereeEmail,
    convertedAt: null,
    rewardClaimed: false,
  });

  localStorage.setItem(REFERRAL_KEY, JSON.stringify(data));
  return data;
}

/**
 * Mark a referral as converted (referee signed up).
 */
export function markReferralConverted(userId: string, refereeEmail: string): ReferralData {
  const data = getReferralData(userId);
  const referral = data.referrals.find((r) => r.refereeEmail === refereeEmail);

  if (referral && !referral.convertedAt) {
    referral.convertedAt = new Date().toISOString();
    localStorage.setItem(REFERRAL_KEY, JSON.stringify(data));
  }

  return data;
}

/**
 * Get the referral link URL with UTM attribution params.
 */
export function getReferralLink(userId: string): string {
  const data = getReferralData(userId);
  const params = new URLSearchParams({
    ref: data.code,
    utm_source: "funnelforge",
    utm_medium: "referral",
    utm_campaign: "referral_program",
  });
  return `${window.location.origin}/?${params.toString()}`;
}

/**
 * Get referral stats for display.
 */
export function getReferralStats(userId: string): {
  code: string;
  totalReferred: number;
  totalConverted: number;
  rewardsEarned: number;
} {
  const data = getReferralData(userId);
  return {
    code: data.code,
    totalReferred: data.referrals.length,
    totalConverted: data.referrals.filter((r) => r.convertedAt).length,
    rewardsEarned: data.referrals.filter((r) => r.convertedAt && r.rewardClaimed).length,
  };
}
