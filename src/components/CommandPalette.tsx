// ═══════════════════════════════════════════════
// CommandPalette — Keyboard "/" shortcut
// Fitts's Law compliance: large keyboard target.
// Power-user delight + reduces navigation friction.
// Triggered by "/" key or search icon (≥44px target).
// ═══════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, LayoutDashboard, Zap, DollarSign, Users, BarChart3, Settings, Sparkles, TrendingUp, Heart } from "lucide-react";

interface CommandItem {
  id: string;
  label: { he: string; en: string };
  path: string;
  icon: React.ElementType;
  category: { he: string; en: string };
  keywords: string[];
}

const COMMANDS: CommandItem[] = [
  { id: "dashboard", label: { he: "דשבורד", en: "Dashboard" }, path: "/dashboard", icon: LayoutDashboard, category: { he: "ניווט", en: "Navigation" }, keywords: ["dashboard", "home", "דשבורד", "ראשי"] },
  { id: "wizard", label: { he: "אשף — תוכנית חדשה", en: "Wizard — New Plan" }, path: "/wizard", icon: Sparkles, category: { he: "יצירה", en: "Create" }, keywords: ["wizard", "new plan", "אשף", "תוכנית חדשה"] },
  { id: "differentiate", label: { he: "בידול", en: "Differentiation" }, path: "/differentiate", icon: Zap, category: { he: "מודולים", en: "Modules" }, keywords: ["differentiate", "בידול", "unique"] },
  { id: "pricing", label: { he: "תמחור", en: "Pricing" }, path: "/pricing", icon: DollarSign, category: { he: "מודולים", en: "Modules" }, keywords: ["pricing", "תמחור", "price", "מחיר"] },
  { id: "sales", label: { he: "מכירות", en: "Sales" }, path: "/sales", icon: TrendingUp, category: { he: "מודולים", en: "Modules" }, keywords: ["sales", "מכירות", "סגירה"] },
  { id: "retention", label: { he: "שימור", en: "Retention" }, path: "/retention", icon: Heart, category: { he: "מודולים", en: "Modules" }, keywords: ["retention", "שימור", "loyalty"] },
  { id: "crm", label: { he: "CRM", en: "CRM" }, path: "/crm", icon: Users, category: { he: "מודולים", en: "Modules" }, keywords: ["crm", "contacts", "לקוחות"] },
  { id: "plans", label: { he: "תוכניות שמורות", en: "Saved Plans" }, path: "/plans", icon: BarChart3, category: { he: "ניווט", en: "Navigation" }, keywords: ["plans", "saved", "תוכניות"] },
  { id: "aarrr", label: { he: "AARRR Dashboard", en: "AARRR Dashboard" }, path: "/admin/aarrr", icon: BarChart3, category: { he: "אדמין", en: "Admin" }, keywords: ["aarrr", "metrics", "admin", "מדדים"] },
  { id: "profile", label: { he: "פרופיל", en: "Profile" }, path: "/profile", icon: Settings, category: { he: "הגדרות", en: "Settings" }, keywords: ["profile", "settings", "פרופיל", "הגדרות"] },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isHe = language === "he";
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? COMMANDS.filter((c) =>
        c.label[language].toLowerCase().includes(query.toLowerCase()) ||
        c.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase()))
      )
    : COMMANDS;

  const go = useCallback(
    (item: CommandItem) => {
      onOpenChange(false);
      navigate(item.path);
    },
    [navigate, onOpenChange]
  );

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter" && filtered[selected]) {
        e.preventDefault();
        go(filtered[selected]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selected, go]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden" aria-label={isHe ? "חיפוש פקודות" : "Command palette"}>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isHe ? "חפש פקודה…" : "Search commands…"}
            className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-base"
            dir="auto"
          />
          <kbd className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono shrink-0">ESC</kbd>
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground" dir="auto">
              {tx({ he: "לא נמצאו תוצאות", en: "No results found" }, language)}
            </p>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    i === selected ? "bg-accent/20 text-foreground" : "text-muted-foreground hover:bg-accent/10"
                  }`}
                  onClick={() => go(item)}
                  onMouseEnter={() => setSelected(i)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-start" dir="auto">{item.label[language]}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{item.category[language]}</Badge>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-border px-4 py-2 flex gap-3 text-xs text-muted-foreground">
          <span><kbd className="font-mono bg-muted rounded px-1">↑↓</kbd> {isHe ? "ניווט" : "navigate"}</span>
          <span><kbd className="font-mono bg-muted rounded px-1">↵</kbd> {isHe ? "פתח" : "open"}</span>
          <span><kbd className="font-mono bg-muted rounded px-1">/</kbd> {isHe ? "פתח" : "open"}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
