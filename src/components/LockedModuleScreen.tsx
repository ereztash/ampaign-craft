// ═══════════════════════════════════════════════════════════════════════════
// LockedModuleScreen — UI for modules hidden by wedge mode
//
// Renders when a user lands on a module that's not part of the active wedge.
// Two purposes:
//   1. Manage expectations — explain why and what's available now
//   2. Capture phantom-interest signal — every visit is logged, every
//      "request unlock" click is logged. After 4-6 weeks, the most-clicked
//      locked module is the natural second wedge.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, ArrowRight, BellRing } from "lucide-react";
import {
  getEnabledModules,
  getModuleLabel,
  type WedgeModule,
} from "@/lib/wedgeMode";
import {
  trackLockedModuleClicked,
  trackUnlockRequested,
} from "@/lib/wedgeTelemetry";

interface Props {
  module: WedgeModule;
}

const MODULE_DESCRIPTIONS: Record<WedgeModule, { he: string; en: string }> = {
  differentiate: {
    he: "מיפוי מתחרים, איתור ערכים סמויים, וניסוח Mechanism Statement.",
    en: "Competitor mapping, hidden values discovery, mechanism statement.",
  },
  wizard: {
    he: "סקריפטי וואטסאפ, audit לקופי, ו-UVP ב-5 פורמטים.",
    en: "WhatsApp scripts, copy QA, and UVP in 5 formats.",
  },
  sales: {
    he: "Pipeline, neuro-closing, ו-Quote builder לפי DISC.",
    en: "Pipeline, neuro-closing, and DISC-aware Quote builder.",
  },
  pricing: {
    he: "פסיכולוגיית תמחור ישראלית + מעבדת ניסויים.",
    en: "Israeli pricing psychology + experiment lab.",
  },
  retention: {
    he: "Churn playbooks, weekly nudges, retention growth.",
    en: "Churn playbooks, weekly nudges, retention growth.",
  },
};

const LockedModuleScreen = ({ module }: Props) => {
  const { language } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    trackLockedModuleClicked(module, { userId: user?.id });
  }, [module, user?.id]);

  const enabledModules = useMemo(() => getEnabledModules(), []);
  const primaryEnabled = enabledModules[0];

  const handleUnlockRequest = () => {
    trackUnlockRequested(module, { userId: user?.id });
  };

  const moduleName = getModuleLabel(module, language);
  const description = MODULE_DESCRIPTIONS[module][language];

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card className="border-muted">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-muted/50 p-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <Badge variant="outline" className="text-xs">
              {tx({ he: "נעול בשלב הנוכחי", en: "Locked in current phase" }, language)}
            </Badge>
          </div>
          <CardTitle className="text-xl">
            {tx(
              {
                he: `המודול "${moduleName}" יפתח אחרי שתשלים את ה-wedge הנוכחי`,
                en: `"${moduleName}" unlocks after you complete the current wedge`,
              },
              language,
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground" dir="auto">
            {description}
          </p>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
            <p className="text-sm font-medium" dir="auto">
              {tx(
                {
                  he: "אנחנו פוקוסים על מודול אחד בכל פעם, וזה מכוון.",
                  en: "We focus on one module at a time, and it's intentional.",
                },
                language,
              )}
            </p>
            <p className="text-xs text-muted-foreground" dir="auto">
              {tx(
                {
                  he: "התמקדות מאפשרת לנו ללמוד מה באמת עובד אצלך, לפני שנפתח עוד דברים. ברגע שתסיים מחזור-ניסוי אחד עם המודול הפעיל, נפתח את הבא.",
                  en: "Focus lets us learn what actually works for you before unlocking more. Once you complete one experiment cycle in the active module, the next opens.",
                },
                language,
              )}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link to={`/${primaryEnabled}`}>
                {tx(
                  {
                    he: `המשך עם ${getModuleLabel(primaryEnabled, "he")} (פעיל)`,
                    en: `Continue with ${getModuleLabel(primaryEnabled, "en")} (active)`,
                  },
                  language,
                )}
                <ArrowRight className="h-4 w-4 ms-2" />
              </Link>
            </Button>

            <Button variant="outline" onClick={handleUnlockRequest}>
              <BellRing className="h-4 w-4 me-2" />
              {tx(
                {
                  he: `סמן עניין במודול "${moduleName}"`,
                  en: `Mark interest in "${moduleName}"`,
                },
                language,
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center" dir="auto">
              {tx(
                {
                  he: "הקליק נרשם. מודולים עם הכי הרבה עניין נפתחים ראשונים.",
                  en: "Click is logged. Modules with most interest unlock first.",
                },
                language,
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LockedModuleScreen;
