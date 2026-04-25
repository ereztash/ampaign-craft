// ═══════════════════════════════════════════════
// LeadDetail — per-lead view with the Lead Coach panel.
//
// The 3 research-based recommendations come from leadCoachEngine
// (Approach / Timing / Leverage). This file renders the page;
// the engine and recommendations UI are added in Phase 4.
// ═══════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import BackToHub from "@/components/BackToHub";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/i18n/tx";
import { ChevronLeft, ChevronRight, Sparkles, Phone, Mail, Building2, DollarSign, Calendar } from "lucide-react";
import { getLead, type Lead } from "@/services/leadsService";

const LeadDetail = () => {
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  const { leadId } = useParams<{ leadId: string }>();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!leadId) return;
    void (async () => {
      const row = await getLead(leadId);
      if (!cancelled) {
        setLead(row);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [leadId]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-4 pb-16 max-w-2xl">
          <BackToHub />
          <p className="text-center py-16" dir="auto">{tx({ he: "התחבר כדי לצפות בליד", en: "Sign in to view this lead" }, language)}</p>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-4 pb-16 max-w-3xl">
          <BackToHub />
          <p className="text-center py-16 text-muted-foreground" dir="auto">{tx({ he: "טוען...", en: "Loading..." }, language)}</p>
        </main>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-4 pb-16 max-w-2xl">
          <BackToHub />
          <p className="text-center py-16" dir="auto">{tx({ he: "ליד לא נמצא", en: "Lead not found" }, language)}</p>
          <div className="text-center">
            <Link to="/crm">
              <Button variant="outline">{tx({ he: "חזרה ל-CRM", en: "Back to CRM" }, language)}</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-4 pb-16 max-w-3xl">
        <BackToHub currentPage={lead.name} />

        <Link to="/crm">
          <Button variant="ghost" size="sm" className="mb-4 gap-1">
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {tx({ he: "חזרה ל-CRM", en: "Back to CRM" }, language)}
          </Button>
        </Link>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span dir="auto">{lead.name}</span>
              <Badge variant="outline" className="text-xs">{lead.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lead.business && <p className="flex items-center gap-2" dir="auto"><Building2 className="h-4 w-4 text-muted-foreground" />{lead.business}</p>}
            {lead.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span dir="ltr">{lead.phone}</span></p>}
            {lead.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span dir="ltr">{lead.email}</span></p>}
            {lead.valueNIS > 0 && <p className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-500" />₪{lead.valueNIS.toLocaleString()}</p>}
            {lead.nextFollowup && <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{new Date(lead.nextFollowup).toLocaleDateString(tx({ he: "he-IL", en: "en-US" }, language))}</p>}
            {lead.source && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground" dir="auto">{tx({ he: "מקור:", en: "Source:" }, language)}</p>
                <p dir="auto">{lead.source}</p>
              </div>
            )}
            {lead.whyUs && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground" dir="auto">{tx({ he: "למה דווקא אצלך:", en: "Why you:" }, language)}</p>
                <p dir="auto">{lead.whyUs}</p>
              </div>
            )}
            {lead.lostReason && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground" dir="auto">{tx({ he: "סיבת הפסד:", en: "Lost reason:" }, language)}</p>
                <p dir="auto">{lead.lostReason}</p>
              </div>
            )}
            {lead.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground" dir="auto">{tx({ he: "הערות:", en: "Notes:" }, language)}</p>
                <p dir="auto">{lead.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              {tx({ he: "Lead Coach — 3 המלצות מבוססות מחקר", en: "Lead Coach — 3 research-based recommendations" }, language)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground" dir="auto">
              {tx({ he: "המלצות מותאמות אישית לליד הזה יוצגו כאן בקרוב.", en: "Personalized recommendations for this lead will appear here soon." }, language)}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LeadDetail;
