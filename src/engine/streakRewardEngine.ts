// ═══════════════════════════════════════════════
// Streak Reward Engine
// Cross-domain: Variable Ratio Reinforcement (Skinner 1938) ×
// Self-Determination Theory (Deci & Ryan) × Fogg B=MAT
//
// Random bonus on return visit (3-day, 7-day, 30-day).
// Variable ratio is the most resistant to extinction.
// ═══════════════════════════════════════════════

const LAST_VISIT_KEY  = "funnelforge-last-visit";
const STREAK_KEY      = "funnelforge-streak-count";
const REWARD_LOG_KEY  = "funnelforge-reward-log";

export interface StreakReward {
  type: "daily" | "weekly" | "monthly" | "bonus";
  milestone: number; // consecutive days
  message: { he: string; en: string };
  emoji: string;
}

// ─── Variable ratio reward schedule ───────────────────────────────────────
// Regular milestones + a random bonus on ~20% of visits (variable ratio)
const MILESTONE_REWARDS: StreakReward[] = [
  { type: "daily",   milestone: 1,  message: { he: "ביום הראשון!", en: "Day 1 streak!" }, emoji: "🔥" },
  { type: "daily",   milestone: 3,  message: { he: "3 ימים רצופים!", en: "3-day streak!" }, emoji: "🔥🔥" },
  { type: "weekly",  milestone: 7,  message: { he: "שבוע מלא — מדהים!", en: "Full week — amazing!" }, emoji: "🏆" },
  { type: "weekly",  milestone: 14, message: { he: "שבועיים! אתה בטופ 15%.", en: "2 weeks! You're in the top 15%." }, emoji: "💎" },
  { type: "monthly", milestone: 30, message: { he: "חודש שלם! אתה בטופ 5%.", en: "Full month! Top 5%." }, emoji: "👑" },
];

const BONUS_MESSAGES: { he: string; en: string }[] = [
  { he: "בונוס פתאומי! אתה בונה הרגל אמיתי.", en: "Surprise bonus! You're building a real habit." },
  { he: "ביקור נוסף — +10 נקודות בונוס!", en: "Another visit — +10 bonus points!" },
  { he: "עקביות = תוצאות. המשך כך!", en: "Consistency = results. Keep going!" },
];

export interface StreakStatus {
  currentStreak: number;
  lastVisit: string | null;
  reward: StreakReward | null;
  totalVisits: number;
}

/**
 * Call on Dashboard mount. Updates streak and returns a reward if earned.
 */
export function recordVisitAndGetReward(): StreakStatus {
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    const streakRaw = localStorage.getItem(STREAK_KEY);
    let streak = streakRaw ? parseInt(streakRaw, 10) : 0;

    let reward: StreakReward | null = null;

    if (lastVisit === todayStr) {
      // Already visited today — no update, no reward
      return { currentStreak: streak, lastVisit, reward: null, totalVisits: streak };
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (lastVisit === yesterdayStr) {
      streak += 1;
    } else {
      // Streak broken — reset
      streak = 1;
    }

    localStorage.setItem(LAST_VISIT_KEY, todayStr);
    localStorage.setItem(STREAK_KEY, String(streak));

    // Check milestone rewards
    const milestone = MILESTONE_REWARDS.find((r) => r.milestone === streak);
    if (milestone) {
      reward = milestone;
    } else if (Math.random() < 0.2) {
      // ~20% random bonus on non-milestone days (variable ratio)
      const msg = BONUS_MESSAGES[Math.floor(Math.random() * BONUS_MESSAGES.length)];
      reward = { type: "bonus", milestone: streak, message: msg, emoji: "🎁" };
    }

    if (reward) {
      // Log reward for history
      try {
        const log = JSON.parse(localStorage.getItem(REWARD_LOG_KEY) || "[]");
        log.push({ date: todayStr, type: reward.type, milestone: reward.milestone });
        if (log.length > 50) log.splice(0, log.length - 50);
        localStorage.setItem(REWARD_LOG_KEY, JSON.stringify(log));
      } catch { /* ignore */ }
    }

    return { currentStreak: streak, lastVisit: todayStr, reward, totalVisits: streak };
  } catch {
    return { currentStreak: 0, lastVisit: null, reward: null, totalVisits: 0 };
  }
}

/**
 * Returns true if the streak is at risk (user hasn't visited today
 * and it's past noon local time).
 */
export function isStreakAtRisk(): boolean {
  try {
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    const todayStr = new Date().toISOString().slice(0, 10);
    if (lastVisit === todayStr) return false;
    return new Date().getHours() >= 12;
  } catch {
    return false;
  }
}
