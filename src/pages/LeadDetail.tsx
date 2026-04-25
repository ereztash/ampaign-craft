// ═══════════════════════════════════════════════
// LeadDetail — per-lead view with the Lead Coach panel + interactions
// timeline. The 3 research-based recommendations come from
// leadCoachEngine via the useLeadCoach hook.
// ═══════════════════════════════════════════════

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import BackToHub from "@/components/BackToHub";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { tx } from "@/i18n/tx";
import {
  ChevronLeft, ChevronRight, Phone, Mail, Building2,
  DollarSign, Calendar, MessageSquare,
} from "lucide-react";
import { useLeadCoach } from "@/hooks/useLeadCoach";
import { LeadCoachPanel } from "@/components/LeadCoachPanel";
import { addInteraction, type InteractionType } from "@/services/leadsService";

const INTERACTION_TYPES: { id: InteractionType; he: string; en: string }[] = [
  { id: "note",    he: "הערה",    en: "Note" },
  { id: "call",    he: "שיחה",   en: "Call" },
  { id: "meeting", he: "פגישה",  en: "Meeting" },
  { id: "email",   he: "אימייל", en: "Email" },
  { id: "whatsapp", he: "WhatsApp", en: "WhatsApp" },
];

const LeadDetail = () => {
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { leadId } = useParams<{ leadId: string }>();

  const { lead, interactions, recommendations, loading, refresh } =
    useLeadCoach(user?.id, leadId);

  const [newType, setNewType] = useState<InteractionType>("note");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAddInteraction = async () => {
    if (!user?.id || !leadId || !newNote.trim() || adding) return;
    setAdding(true);
    const created = await addInteraction(user.id, leadId, newType, newNote.trim());
    setAdding(false);
    if (!created) {
      toast({ title: tx({ he: "ההוספה נכשלה", en: "Failed to add" }, language), variant: "destructive" });
      return;
    }
    setNewNote("");
    refresh();
    toast({ title: tx({ he: "האינטראקציה נוספה", en: "Interaction added" }, language) });
  };

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

  if (loading && !lead) {
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

        <div className="mb-4">
          <LeadCoachPanel recommendations={recommendations} loading={loading} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              {tx({ he: "אינטראקציות", en: "Interactions" }, language)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={newType} onValueChange={(v) => setNewType(v as InteractionType)}>
                <SelectTrigger className="text-xs sm:w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTERACTION_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">{tx(t, language)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                rows={2}
                dir="auto"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={tx({ he: "מה קרה? (תיעוד מקצר)", en: "What happened? (short note)" }, language)}
                className="resize-none text-xs flex-1"
              />
              <Button onClick={handleAddInteraction} disabled={!newNote.trim() || adding} className="self-start">
                {adding ? tx({ he: "מוסיף...", en: "Adding..." }, language) : tx({ he: "הוסף", en: "Add" }, language)}
              </Button>
            </div>

            {interactions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4" dir="auto">
                {tx({ he: "אין עדיין אינטראקציות מתועדות.", en: "No interactions logged yet." }, language)}
              </p>
            )}

            {interactions.length > 0 && (
              <ul className="space-y-2">
                {interactions.map((ix) => {
                  const typeLabel = INTERACTION_TYPES.find((t) => t.id === ix.type);
                  return (
                    <li key={ix.id} className="rounded-md border bg-card p-2 text-xs">
                      <div className="flex items-center justify-between gap-2 text-muted-foreground">
                        <span className="font-medium">{typeLabel ? tx(typeLabel, language) : ix.type}</span>
                        <span dir="ltr">{new Date(ix.occurredAt).toLocaleString(tx({ he: "he-IL", en: "en-US" }, language))}</span>
                      </div>
                      <p className="mt-1" dir="auto">{ix.note}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LeadDetail;
