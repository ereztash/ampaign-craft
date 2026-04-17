// Lightweight local notification queue — no server required.
// Notifications are written by analytics events and read by NotificationCenter.
// Stored in localStorage under NOTIFICATION_KEY (max MAX_NOTIFICATIONS).

import { safeStorage } from "./safeStorage";

const NOTIFICATION_KEY = "funnelforge-notifications-v1";
const MAX_NOTIFICATIONS = 20;

export type NotificationType =
  | "plan_saved"
  | "referral_clicked"
  | "referral_converted"
  | "archetype_revealed"
  | "achievement"
  | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: { he: string; en: string };
  body?: { he: string; en: string };
  read: boolean;
  createdAt: string;
}

export const notificationQueue = {
  getAll(): AppNotification[] {
    return safeStorage.getJSON<AppNotification[]>(NOTIFICATION_KEY, []);
  },

  getUnreadCount(): number {
    return this.getAll().filter((n) => !n.read).length;
  },

  push(notification: Omit<AppNotification, "id" | "read" | "createdAt">): void {
    const all = this.getAll();
    const newItem: AppNotification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    const trimmed = [newItem, ...all].slice(0, MAX_NOTIFICATIONS);
    safeStorage.setJSON(NOTIFICATION_KEY, trimmed);
  },

  markAllRead(): void {
    const all = this.getAll().map((n) => ({ ...n, read: true }));
    safeStorage.setJSON(NOTIFICATION_KEY, all);
  },

  clear(): void {
    safeStorage.setJSON(NOTIFICATION_KEY, []);
  },
};

// Convenience writers — called from analytics/event hooks
export function notifyPlanSaved(planName: string): void {
  notificationQueue.push({
    type: "plan_saved",
    title: { he: "תוכנית נשמרה", en: "Plan saved" },
    body: { he: planName, en: planName },
  });
}

export function notifyReferralClicked(code: string): void {
  notificationQueue.push({
    type: "referral_clicked",
    title: { he: "מישהו הגיע דרך ההפניה שלך!", en: "Someone visited via your referral!" },
    body: { he: `קוד: ${code}`, en: `Code: ${code}` },
  });
}

export function notifyArchetypeRevealed(archetypeName: { he: string; en: string }): void {
  notificationQueue.push({
    type: "archetype_revealed",
    title: { he: "הארכיטיפ שלך נחשף!", en: "Your archetype revealed!" },
    body: archetypeName,
  });
}
