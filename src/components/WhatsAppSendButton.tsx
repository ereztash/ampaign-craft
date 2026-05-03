// WhatsAppSendButton — שלח הודעה ישירות ל-WhatsApp
// Uses wa.me deep link — works without Business API.
// For full Business API sending, see supabase/functions/whatsapp-send.

import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { tx } from "@/i18n/tx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Send, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { captureOutcome } from "@/engine/outcomeLoopEngine";
import { safeStorage } from "@/lib/safeStorage";

interface OutreachLogEntry {
  leadId: string;
  recommendationId: string;
  sentAt: string;
}

function appendOutreachLog(entry: OutreachLogEntry): void {
  try {
    const key = "funnelforge-outreach-log";
    const existing = safeStorage.getJSON<OutreachLogEntry[]>(key, []);
    const trimmed = [...existing.filter((e) => e.leadId !== entry.leadId), entry].slice(-200);
    safeStorage.setJSON(key, trimmed);
  } catch {
    // localStorage can throw on quota exceeded or in private mode
  }
}

interface WhatsAppSendButtonProps {
  message: string;
  /** Pre-fill a specific phone number (optional) */
  defaultPhone?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
  label?: string;
  /** Stable id for outcome tracking. Required to seal the action loop. */
  recommendationId?: string;
  /** Optional lead context for outcome payload. */
  leadId?: string;
}

function normalizePhone(raw: string): string {
  let n = raw.replace(/[\s\-()]/g, "");
  if (n.startsWith("0")) n = "972" + n.slice(1);
  if (!n.startsWith("+") && !n.startsWith("972")) n = "972" + n;
  return n.replace(/^\+/, "");
}

function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

export function WhatsAppSendButton({
  message,
  defaultPhone = "",
  size = "sm",
  variant = "outline",
  label,
  recommendationId,
  leadId,
}: WhatsAppSendButtonProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHe = language === "he";
  const [phone, setPhone] = useState(defaultPhone);
  const [open, setOpen] = useState(false);

  const recordSend = (sentPhone: string) => {
    if (!recommendationId) return;
    try {
      captureOutcome(
        recommendationId,
        user?.id ?? null,
        "navigated",
        7,
        leadId ? 1 : null,
      );
    } catch {
      // outcome capture failures must not block the actual send
    }
    if (leadId) {
      appendOutreachLog({
        leadId,
        recommendationId,
        sentAt: new Date().toISOString(),
      });
    }
  };

  const handleSend = () => {
    const normalized = normalizePhone(phone);
    recordSend(normalized);
    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleSendNoPhone = () => {
    recordSend("");
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  // Direct-send path: skip popover when defaultPhone is valid 9-15 digits.
  const handleTriggerClick = () => {
    if (isValidPhone(defaultPhone)) {
      const normalized = normalizePhone(defaultPhone);
      recordSend(normalized);
      const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setOpen(true);
  };

  // When defaultPhone is valid, render a direct-send button (no popover).
  if (isValidPhone(defaultPhone)) {
    return (
      <Button
        size={size}
        variant={variant}
        onClick={handleTriggerClick}
        className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/20"
      >
        <MessageCircle className="h-3.5 w-3.5 fill-green-500 text-green-500" />
        {label ?? (tx({ he: "שלח ב-WhatsApp", en: "Send via WhatsApp" }, language))}
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size={size}
          variant={variant}
          className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/20"
        >
          <MessageCircle className="h-3.5 w-3.5 fill-green-500 text-green-500" />
          {label ?? (tx({ he: "שלח ב-WhatsApp", en: "Send via WhatsApp" }, language))}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" dir={tx({ he: "rtl", en: "ltr" }, language)} align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold" dir="auto">
              {tx({ he: "שלח ב-WhatsApp", en: "Send via WhatsApp" }, language)}
            </h4>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wa-phone" className="text-xs" dir="auto">
              {tx({ he: "מספר טלפון (אופציונלי)", en: "Phone number (optional)" }, language)}
            </Label>
            <Input
              id="wa-phone"
              dir="ltr"
              type="tel"
              placeholder="050-000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="text-sm"
              onKeyDown={(e) => e.key === "Enter" && phone && handleSend()}
            />
            <p className="text-[10px] text-muted-foreground" dir="auto">
              {isHe
                ? "השאר ריק כדי לבחור איש קשר ב-WhatsApp"
                : "Leave empty to choose a contact in WhatsApp"}
            </p>
          </div>

          <div className="flex gap-2">
            {phone ? (
              <Button size="sm" className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={handleSend}>
                <Send className="h-3.5 w-3.5" />
                {tx({ he: "שלח", en: "Send" }, language)}
              </Button>
            ) : (
              <Button size="sm" className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={handleSendNoPhone}>
                <MessageCircle className="h-3.5 w-3.5" />
                {tx({ he: "פתח WhatsApp", en: "Open WhatsApp" }, language)}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
