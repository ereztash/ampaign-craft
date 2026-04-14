// EmailComposer — compose & send email from generated copy
// Supports: mailto: deep link (works everywhere) + Gmail web compose link.
// Full OAuth sending can be wired to the gmail-send edge function.

import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { tx } from "@/i18n/tx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailComposerProps {
  subject?: string;
  body: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
  label?: string;
}

export function EmailComposer({
  subject: defaultSubject = "",
  body: defaultBody,
  size = "sm",
  variant = "outline",
  label,
}: EmailComposerProps) {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);

  const handleMailto = () => {
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);
    const mailto = `mailto:${encodeURIComponent(to)}?${params.toString()}`;
    window.location.href = mailto;
    setOpen(false);
  };

  const handleGmail = () => {
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to,
      su: subject,
      body,
    });
    window.open(
      `https://mail.google.com/mail/?${params.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );
    setOpen(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      toast({ title: tx({ he: "הועתק ללוח", en: "Copied to clipboard" }, language) });
    } catch {
      toast({ title: tx({ he: "שגיאה בהעתקה", en: "Copy failed" }, language), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size={size}
          variant={variant}
          className="gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/20"
        >
          <Mail className="h-3.5 w-3.5" />
          {label ?? (tx({ he: "שלח באימייל", en: "Send via Email" }, language))}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg" dir={tx({ he: "rtl", en: "ltr" }, language)}>
        <DialogHeader>
          <DialogTitle dir="auto">
            {tx({ he: "חיבור אימייל", en: "Compose Email" }, language)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email-to" className="text-xs" dir="auto">
              {tx({ he: "נמען", en: "To" }, language)}
            </Label>
            <Input
              id="email-to"
              dir="ltr"
              type="email"
              placeholder="name@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="email-subject" className="text-xs" dir="auto">
              {tx({ he: "נושא", en: "Subject" }, language)}
            </Label>
            <Input
              id="email-subject"
              dir="auto"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={tx({ he: "נושא האימייל", en: "Email subject" }, language)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="email-body" className="text-xs" dir="auto">
              {tx({ he: "תוכן", en: "Body" }, language)}
            </Label>
            <Textarea
              id="email-body"
              dir="auto"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="text-sm font-mono resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleMailto}
            >
              <Send className="h-3.5 w-3.5" />
              {tx({ he: "פתח בתוכנת המייל", en: "Open in Mail App" }, language)}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleGmail}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Gmail
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-muted-foreground"
              onClick={handleCopy}
            >
              {tx({ he: "העתק", en: "Copy" }, language)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
