// ═══════════════════════════════════════════════════════════════════════════
// AdminWedge — Runtime control panel for wedge mode
//
// Owners only. Switches the active wedge mode for the current browser
// (localStorage). Useful for:
//   - Demoing different wedges to different prospects
//   - Toggling between focused / full app during onboarding flows
//   - Comparing UX between modes without redeploying
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  WEDGE_MODES,
  getWedgeMode,
  setWedgeMode,
  clearWedgeMode,
  getEnabledModules,
  getLockedModules,
  getModuleLabel,
  type WedgeMode,
} from "@/lib/wedgeMode";

const MODE_LABELS: Record<WedgeMode, { he: string; en: string; description: { he: string; en: string } }> = {
  "all": {
    he: "הכל פתוח",
    en: "All modules",
    description: {
      he: "5 המודולים נראים, כמו לפני ה-wedge",
      en: "All 5 modules visible, pre-wedge experience",
    },
  },
  "pricing-only": {
    he: "תמחור בלבד",
    en: "Pricing only",
    description: {
      he: "רק Pricing נראה. שאר המודולים נעולים עם CTA לסימון עניין",
      en: "Only Pricing visible. Others locked with interest-CTA",
    },
  },
  "marketing-only": {
    he: "שיווק בלבד",
    en: "Marketing only",
    description: {
      he: "רק Wizard/Marketing. שאר נעולים",
      en: "Only Wizard/Marketing. Others locked",
    },
  },
  "differentiate-only": {
    he: "בידול בלבד",
    en: "Differentiation only",
    description: {
      he: "רק Differentiate. שאר נעולים",
      en: "Only Differentiate. Others locked",
    },
  },
};

const AdminWedge = () => {
  const { language } = useLanguage();
  const [currentMode, setCurrentMode] = useState<WedgeMode>(getWedgeMode());

  useEffect(() => {
    setCurrentMode(getWedgeMode());
  }, []);

  const apply = (mode: WedgeMode) => {
    setWedgeMode(mode);
    setCurrentMode(mode);
    setTimeout(() => window.location.reload(), 300);
  };

  const reset = () => {
    clearWedgeMode();
    setCurrentMode(getWedgeMode());
    setTimeout(() => window.location.reload(), 300);
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">
          {tx({ he: "ניהול Wedge Mode", en: "Wedge Mode Control" }, language)}
        </h1>
        <p className="text-sm text-muted-foreground" dir="auto">
          {tx(
            {
              he: "שולט אילו מודולים נראים בנתיב הראשי. שינוי כאן מתעדכן ב-localStorage של הדפדפן ומופעל מיד אחרי רענון.",
              en: "Controls which modules are visible in the main app. Change here is stored in browser localStorage and applies after refresh.",
            },
            language,
          )}
        </p>
      </div>

      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            {tx({ he: "מצב נוכחי", en: "Current mode" }, language)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge>{MODE_LABELS[currentMode][language]}</Badge>
            <span className="text-xs text-muted-foreground" dir="auto">
              {MODE_LABELS[currentMode].description[language]}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
              <div className="font-medium mb-1">
                {tx({ he: "פעילים", en: "Enabled" }, language)}
              </div>
              <div className="text-muted-foreground">
                {getEnabledModules().map((m) => getModuleLabel(m, language)).join(" · ")}
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 border p-2">
              <div className="font-medium mb-1">
                {tx({ he: "נעולים", en: "Locked" }, language)}
              </div>
              <div className="text-muted-foreground">
                {getLockedModules().length === 0
                  ? tx({ he: "אין", en: "None" }, language)
                  : getLockedModules().map((m) => getModuleLabel(m, language)).join(" · ")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            {tx({ he: "החלף מצב", en: "Switch mode" }, language)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {WEDGE_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => apply(mode)}
              disabled={mode === currentMode}
              className={`w-full text-start rounded-lg border p-3 transition-colors ${
                mode === currentMode
                  ? "border-primary bg-primary/5 cursor-default"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{MODE_LABELS[mode][language]}</span>
                {mode === currentMode && (
                  <Badge variant="default" className="text-xs">
                    {tx({ he: "פעיל", en: "Active" }, language)}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground" dir="auto">
                {MODE_LABELS[mode].description[language]}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardContent className="pt-4">
          <Button variant="outline" onClick={reset} className="w-full">
            {tx({ he: "איפוס לברירת מחדל (env)", en: "Reset to env default" }, language)}
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center" dir="auto">
            {tx(
              {
                he: "מסיר את ה-override הלוקאלי. ייקח את הערך מ-VITE_WEDGE_MODE או 'all' אם לא מוגדר.",
                en: "Removes local override. Falls back to VITE_WEDGE_MODE env or 'all' if not set.",
              },
              language,
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWedge;
