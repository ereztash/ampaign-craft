// WhatsAppSendButton — שלח הודעה ישירות ל-WhatsApp
// Uses wa.me deep link — works without Business API.
// For full Business API sending, see supabase/functions/whatsapp-send.

import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Send, X } from "lucide-react";

interface WhatsAppSendButtonProps {
  message: string;
  /** Pre-fill a specific phone number (optional) */
  defaultPhone?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
  label?: string;
}

export function WhatsAppSendButton({
  message,
  defaultPhone = "",
  size = "sm",
  variant = "outline",
  label,
}: WhatsAppSendButtonProps) {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [phone, setPhone] = useState(defaultPhone);
  const [open, setOpen] = useState(false);

  const handleSend = () => {
    // Normalize phone: remove spaces, dashes, leading zeros, add country code if missing
    let normalized = phone.replace(/[\s\-\(\)]/g, "");
    if (normalized.startsWith("0")) {
      normalized = "972" + normalized.slice(1); // Israeli default
    }
    if (!normalized.startsWith("+") && !normalized.startsWith("972")) {
      normalized = "972" + normalized;
    }
    normalized = normalized.replace(/^\+/, "");

    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleSendNoPhone = () => {
    // Open WhatsApp without specific contact (user picks from their contacts)
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size={size}
          variant={variant}
          className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/20"
        >
          <MessageCircle className="h-3.5 w-3.5 fill-green-500 text-green-500" />
          {label ?? (isHe ? "שלח ב-WhatsApp" : "Send via WhatsApp")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" dir={isHe ? "rtl" : "ltr"} align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold" dir="auto">
              {isHe ? "שלח ב-WhatsApp" : "Send via WhatsApp"}
            </h4>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wa-phone" className="text-xs" dir="auto">
              {isHe ? "מספר טלפון (אופציונלי)" : "Phone number (optional)"}
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
                {isHe ? "שלח" : "Send"}
              </Button>
            ) : (
              <Button size="sm" className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={handleSendNoPhone}>
                <MessageCircle className="h-3.5 w-3.5" />
                {isHe ? "פתח WhatsApp" : "Open WhatsApp"}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
