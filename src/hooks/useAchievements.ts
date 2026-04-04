import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

export interface Achievement {
  id: string;
  name: { he: string; en: string };
  description: { he: string; en: string };
  emoji: string;
  unlockedAt: string | null;
}

const STORAGE_KEY = "funnelforge-achievements";

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
];

function loadAchievements(): Achievement[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return ACHIEVEMENT_DEFS.map((def) => ({
      ...def,
      unlockedAt: stored[def.id] || null,
    }));
  } catch {
    return ACHIEVEMENT_DEFS.map((def) => ({ ...def, unlockedAt: null }));
  }
}

function saveUnlock(id: string) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    stored[id] = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // ignore
  }
}

export function useAchievements(language: "he" | "en" = "he") {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    setAchievements(loadAchievements());
  }, []);

  const unlock = useCallback(
    (id: string) => {
      setAchievements((prev) => {
        const existing = prev.find((a) => a.id === id);
        if (!existing || existing.unlockedAt) return prev; // Already unlocked

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

  const isUnlocked = useCallback(
    (id: string) => achievements.find((a) => a.id === id)?.unlockedAt !== null,
    [achievements]
  );

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const totalCount = achievements.length;

  return { achievements, unlock, isUnlocked, unlockedCount, totalCount };
}
