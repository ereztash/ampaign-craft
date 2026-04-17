import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { notificationQueue, type AppNotification } from "@/lib/notificationQueue";

const TYPE_ICON: Record<string, string> = {
  plan_saved: "📋",
  referral_clicked: "🔗",
  referral_converted: "🎉",
  archetype_revealed: "✨",
  achievement: "🏆",
  system: "🔔",
};

function timeAgo(iso: string, language: "he" | "en"): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return language === "he" ? "עכשיו" : "just now";
  if (mins < 60) return language === "he" ? `לפני ${mins} דק׳` : `${mins}m ago`;
  if (hours < 24) return language === "he" ? `לפני ${hours} שע׳` : `${hours}h ago`;
  return language === "he" ? `לפני ${days} ימים` : `${days}d ago`;
}

export function NotificationCenter() {
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(() => {
    setNotifications(notificationQueue.getAll());
  }, []);

  useEffect(() => {
    refresh();
    // Re-read every 30s to catch notifications written by other tabs/events
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const unread = notifications.filter((n) => !n.read).length;

  function handleOpen(next: boolean) {
    setOpen(next);
    if (next && unread > 0) {
      notificationQueue.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0"
          aria-label={tx({ he: "התראות", en: "Notifications" }, language)}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1 end-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={language === "he" ? "start" : "end"}
        className="w-80 p-0 overflow-hidden"
        dir={language === "he" ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">
            {tx({ he: "התראות", en: "Notifications" }, language)}
          </span>
          {notifications.length > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                notificationQueue.clear();
                setNotifications([]);
              }}
            >
              {tx({ he: "נקה הכל", en: "Clear all" }, language)}
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">
              {tx({ he: "אין התראות חדשות", en: "No notifications yet" }, language)}
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`flex gap-3 px-4 py-3 border-b border-border last:border-0 ${
                  n.read ? "opacity-70" : "bg-primary/5"
                }`}
              >
                <span className="text-base shrink-0 leading-none mt-0.5">
                  {TYPE_ICON[n.type] ?? "🔔"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug truncate">
                    {n.title[language]}
                  </p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {n.body[language]}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {timeAgo(n.createdAt, language)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
