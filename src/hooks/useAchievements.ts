import { useState, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { safeParseJson, getWeekId } from "@/lib/utils";
import { safeStorage } from "@/lib/safeStorage";

export interface Achievement {
  id: string;
  name: { he: string; en: string };
  description: { he: string; en: string };
  emoji: string;
  unlockedAt: string | null;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

const STORAGE_KEY = "funnelforge-achievements";
const STREAK_KEY = "funnelforge-streak";

const ACHIEVEMENT_DEFS: Omit<Achievement, "unlockedAt">[] = [
  {
    id: "first_plan",
    name: { he: "הצעד הראשון", en: "First Step" },
    description: { he: "יצרת את המשפך הראשון שלך", en: "Created your first funnel" },
    emoji: "🚀",
  },
  {
    id: "five_plans",
    name: { he: "מתכנן סדרתי", en: "Serial Planner" },
    description: { he: "שמרת 5 תוכניות", en: "Saved 5 plans" },
    emoji: "📋",
  },
  {
    id: "first_import",
    name: { he: "חוקר נתונים", en: "Data Explorer" },
    description: { he: "ייבאת קובץ נתונים לראשונה", en: "Imported your first data file" },
    emoji: "📊",
  },
  {
    id: "stylome_complete",
    name: { he: "טביעת אצבע", en: "Fingerprint" },
    description: { he: "השלמת ניתוח טביעת סגנון", en: "Completed style fingerprint analysis" },
    emoji: "🔍",
  },
  {
    id: "all_tabs",
    name: { he: "חוקר סקרן", en: "Curious Explorer" },
    description: { he: "ביקרת בכל הטאבים", en: "Visited all tabs" },
    emoji: "🗺️",
  },
  {
    id: "hebrew_power",
    name: { he: "כוח העברית", en: "Hebrew Power" },
    description: { he: "יצרת משפך בעברית", en: "Generated a funnel in Hebrew" },
    emoji: "🇮🇱",
  },
  {
    id: "high_score",
    name: { he: "שיווקאי מומחה", en: "Marketing Expert" },
    description: { he: "השגת ציון בריאות שיווקית מעל 80", en: "Achieved marketing health score above 80" },
    emoji: "🏆",
  },
  {
    id: "returning_user",
    name: { he: "נאמנות", en: "Loyal User" },
    description: { he: "חזרת ל-FunnelForge יותר מ-3 פעמים", en: "Returned to FunnelForge more than 3 times" },
    emoji: "💎",
  },
  // Streak achievements
  {
    id: "streak_4",
    name: { he: "עקבי", en: "Consistent" },
    description: { he: "4 שבועות רצופים של שימוש", en: "4 consecutive weeks of usage" },
    emoji: "🔥",
  },
  {
    id: "streak_12",
    name: { he: "מכונת שיווק", en: "Marketing Machine" },
    description: { he: "12 שבועות רצופים של שימוש", en: "12 consecutive weeks of usage" },
    emoji: "⚡",
  },
];

function loadAchievements(): Achievement[] {
  const stored = safeParseJson<Record<string, string>>(STORAGE_KEY, {});
  return ACHIEVEMENT_DEFS.map((def) => ({
    ...def,
    unlockedAt: stored[def.id] || null,
  }));
}

function saveUnlock(id: string) {
  const stored = safeStorage.getJSON<Record<string, string>>(STORAGE_KEY, {});
  stored[id] = new Date().toISOString();
  safeStorage.setJSON(STORAGE_KEY, stored);
}

function loadStreak(): StreakData {
  return safeParseJson<StreakData>(STREAK_KEY, { currentStreak: 0, longestStreak: 0, lastActiveDate: null });
}

function saveStreak(data: StreakData) {
  safeStorage.setJSON(STREAK_KEY, data);
}

function updateStreak(prev: StreakData): StreakData {
  const now = new Date();
  const currentWeek = getWeekId(now);

  if (!prev.lastActiveDate) {
    return { currentStreak: 1, longestStreak: 1, lastActiveDate: currentWeek };
  }

  if (prev.lastActiveDate === currentWeek) {
    return prev; // Same week, no change
  }

  // Check if last active was the previous week
  const [, lastWeekStr] = prev.lastActiveDate.split("-W");
  const [, currWeekStr] = currentWeek.split("-W");
  const lastWeekNum = parseInt(lastWeekStr);
  const currWeekNum = parseInt(currWeekStr);

  // Simple consecutive check (handles year boundary approximately)
  const isConsecutive = currWeekNum === lastWeekNum + 1 ||
    (lastWeekNum >= 52 && currWeekNum === 1);

  if (isConsecutive) {
    const newStreak = prev.currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(prev.longestStreak, newStreak),
      lastActiveDate: currentWeek,
    };
  }

  // Streak broken
  return { currentStreak: 1, longestStreak: prev.longestStreak, lastActiveDate: currentWeek };
}

// --- Mastery Progress ---

export interface MasteryProgress {
  totalFeatures: number;
  usedFeatures: number;
  percentage: number;
  categories: { name: { he: string; en: string }; used: number; total: number }[];
}

const MASTERY_KEY = "funnelforge-mastery";

function loadMastery(): Set<string> {
  return new Set(safeParseJson<string[]>(MASTERY_KEY, []));
}

function saveMastery(features: Set<string>) {
  safeStorage.setJSON(MASTERY_KEY, [...features]);
}

const FEATURE_MAP: Record<string, { he: string; en: string }> = {
  strategy: { he: "אסטרטגיה", en: "Strategy" },
  planning: { he: "תכנון", en: "Planning" },
  content: { he: "תוכן", en: "Content" },
  analytics: { he: "אנליטיקס", en: "Analytics" },
  stylome: { he: "טביעת סגנון", en: "Stylome" },
  branddna: { he: "Brand DNA", en: "Brand DNA" },
  plan_saved: { he: "שמירת תוכנית", en: "Save Plan" },
  data_import: { he: "ייבוא נתונים", en: "Data Import" },
  pdf_export: { he: "ייצוא PDF", en: "PDF Export" },
  share: { he: "שיתוף", en: "Share" },
};

// --- Main Hook ---

export function useAchievements(language: "he" | "en" = "he") {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, longestStreak: 0, lastActiveDate: null });
  const [masteryFeatures, setMasteryFeatures] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAchievements(loadAchievements());

    // Update streak on mount
    const prev = loadStreak();
    const updated = updateStreak(prev);
    saveStreak(updated);
    setStreak(updated);

    setMasteryFeatures(loadMastery());
  }, []);

  const unlock = useCallback(
    (id: string) => {
      setAchievements((prev) => {
        const existing = prev.find((a) => a.id === id);
        if (!existing || existing.unlockedAt) return prev;

        saveUnlock(id);
        const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
        if (def) {
          toast.success(`${def.emoji} ${def.name[language]}`, {
            description: def.description[language],
          });
        }

        return prev.map((a) =>
          a.id === id ? { ...a, unlockedAt: new Date().toISOString() } : a
        );
      });
    },
    [language]
  );

  // Auto-unlock streak achievements
  useEffect(() => {
    if (streak.currentStreak >= 4) unlock("streak_4");
    if (streak.currentStreak >= 12) unlock("streak_12");
  }, [streak.currentStreak, unlock]);

  // Auto-unlock all_tabs when user has visited at least 5 distinct feature areas
  useEffect(() => {
    if (masteryFeatures.size >= 5) unlock("all_tabs");
  }, [masteryFeatures.size, unlock]);

  const trackFeature = useCallback((featureId: string) => {
    setMasteryFeatures((prev) => {
      if (prev.has(featureId)) return prev;
      const next = new Set(prev);
      next.add(featureId);
      saveMastery(next);
      return next;
    });
  }, []);

  const isUnlocked = useCallback(
    (id: string) => achievements.find((a) => a.id === id)?.unlockedAt !== null,
    [achievements]
  );

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const totalCount = achievements.length;

  const mastery = useMemo<MasteryProgress>(() => ({
    totalFeatures: Object.keys(FEATURE_MAP).length,
    usedFeatures: masteryFeatures.size,
    percentage: Math.round((masteryFeatures.size / Object.keys(FEATURE_MAP).length) * 100),
    categories: Object.entries(FEATURE_MAP).map(([key, name]) => ({
      name,
      used: masteryFeatures.has(key) ? 1 : 0,
      total: 1,
    })),
  }), [masteryFeatures]);

  return { achievements, unlock, isUnlocked, unlockedCount, totalCount, streak, trackFeature, mastery, masteryFeatures };
}
