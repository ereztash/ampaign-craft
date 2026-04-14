// ═══════════════════════════════════════════════
// CrmPage — Mini-CRM for FunnelForge
//
// Kanban board with 5 lead statuses.
// Data stored in localStorage (works with both local & Supabase auth).
// ═══════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import BackToHub from "@/components/BackToHub";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { tx } from "@/i18n/tx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { WhatsAppSendButton } from "@/components/WhatsAppSendButton";
import { EmailComposer } from "@/components/EmailComposer";
import {
  Plus,
  Users,
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  Building2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeadStatus = "lead" | "meeting" | "proposal" | "closed" | "lost";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  business: string;
  status: LeadStatus;
  notes: string;
  value: number; // expected deal value ₪
  source: string;
  nextFollowup: string; // ISO date or ""
  createdAt: string;
}

const STORAGE_KEY = "funnelforge-crm-leads";

function loadLeads(): Lead[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLeads(leads: Lead[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

// ─── Column definitions ───────────────────────────────────────────────────────

interface ColDef {
  id: LeadStatus;
  he: string;
  en: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}

const COLUMNS: ColDef[] = [
  { id: "lead",     he: "ליד",    en: "Lead",     color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20",   border: "border-blue-200 dark:border-blue-700", dot: "bg-blue-400" },
  { id: "meeting",  he: "פגישה",  en: "Meeting",  color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-700", dot: "bg-amber-400" },
  { id: "proposal", he: "הצעה",   en: "Proposal", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-700", dot: "bg-purple-400" },
  { id: "closed",   he: "סגור ✓", en: "Closed ✓", color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20",   border: "border-green-200 dark:border-green-700", dot: "bg-green-400" },
  { id: "lost",     he: "אבוד",   en: "Lost",     color: "text-red-500",    bg: "bg-red-50 dark:bg-red-900/20",       border: "border-red-200 dark:border-red-700",   dot: "bg-red-400" },
];

// ─── Empty lead factory ───────────────────────────────────────────────────────

const emptyLead = (status: LeadStatus = "lead"): Omit<Lead, "id" | "createdAt"> => ({
  name: "",
  phone: "",
  email: "",
  business: "",
  status,
  notes: "",
  value: 0,
  source: "",
  nextFollowup: "",
});

// ─── LeadFormDialog ───────────────────────────────────────────────────────────

interface LeadFormDialogProps {
  trigger: React.ReactNode;
  initial?: Lead;
  defaultStatus?: LeadStatus;
  onSave: (lead: Lead) => void;
}

function LeadFormDialog({ trigger, initial, defaultStatus = "lead", onSave }: LeadFormDialogProps) {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Lead, "id" | "createdAt">>(
    initial
      ? { name: initial.name, phone: initial.phone, email: initial.email, business: initial.business, status: initial.status, notes: initial.notes, value: initial.value, source: initial.source, nextFollowup: initial.nextFollowup }
      : emptyLead(defaultStatus)
  );

  const set = (k: keyof typeof form, v: string | number | LeadStatus) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const lead: Lead = {
      id: initial?.id ?? crypto.randomUUID(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      ...form,
    };
    onSave(lead);
    setOpen(false);
    setForm(emptyLead(defaultStatus));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md" dir={tx({ he: "rtl", en: "ltr" }, language)}>
        <DialogHeader>
          <DialogTitle dir="auto">
            {initial ? (tx({ he: "עריכת ליד", en: "Edit Lead" }, language)) : (tx({ he: "ליד חדש", en: "New Lead" }, language))}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pe-1">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="lead-name" className="text-xs" dir="auto">{tx({ he: "שם *", en: "Name *" }, language)}</Label>
            <Input id="lead-name" dir="auto" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={tx({ he: "שם מלא", en: "Full name" }, language)} />
          </div>
          {/* Phone */}
          <div className="space-y-1">
            <Label htmlFor="lead-phone" className="text-xs" dir="auto">{tx({ he: "טלפון", en: "Phone" }, language)}</Label>
            <Input id="lead-phone" dir="ltr" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="050-000-0000" />
          </div>
          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="lead-email" className="text-xs" dir="auto">{tx({ he: "אימייל", en: "Email" }, language)}</Label>
            <Input id="lead-email" dir="ltr" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@company.com" />
          </div>
          {/* Business */}
          <div className="space-y-1">
            <Label htmlFor="lead-biz" className="text-xs" dir="auto">{tx({ he: "שם עסק", en: "Business" }, language)}</Label>
            <Input id="lead-biz" dir="auto" value={form.business} onChange={(e) => set("business", e.target.value)} placeholder={tx({ he: "שם החברה", en: "Company name" }, language)} />
          </div>
          {/* Value + Status row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs" dir="auto">{tx({ he: "ערך עסקה (₪)", en: "Deal Value (₪)" }, language)}</Label>
              <Input
                dir="ltr"
                type="number"
                min={0}
                value={form.value || ""}
                onChange={(e) => set("value", Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" dir="auto">{tx({ he: "סטטוס", en: "Status" }, language)}</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as LeadStatus)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMNS.map((col) => (
                    <SelectItem key={col.id} value={col.id} className="text-xs">
                      {tx(col, language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Follow-up date */}
          <div className="space-y-1">
            <Label htmlFor="lead-followup" className="text-xs" dir="auto">{tx({ he: "פולואפ הבא", en: "Next Follow-up" }, language)}</Label>
            <Input
              id="lead-followup"
              dir="ltr"
              type="date"
              value={form.nextFollowup}
              onChange={(e) => set("nextFollowup", e.target.value)}
            />
          </div>
          {/* Source */}
          <div className="space-y-1">
            <Label htmlFor="lead-source" className="text-xs" dir="auto">{tx({ he: "מקור", en: "Source" }, language)}</Label>
            <Input id="lead-source" dir="auto" value={form.source} onChange={(e) => set("source", e.target.value)} placeholder={tx({ he: "פייסבוק, הפניה, אתר...", en: "Facebook, referral, website..." }, language) } />
          </div>
          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="lead-notes" className="text-xs" dir="auto">{tx({ he: "הערות", en: "Notes" }, language)}</Label>
            <Textarea id="lead-notes" dir="auto" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder={tx({ he: "הערות חופשיות...", en: "Free notes..." }, language)} className="resize-none text-xs" />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!form.name.trim()}>
            {tx({ he: "שמור", en: "Save" }, language)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── LeadCard ─────────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: Lead;
  col: ColDef;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, status: LeadStatus) => void;
  isHe: boolean;
  language: "he" | "en";
}

function LeadCard({ lead, col, onEdit, onDelete, onMove, isHe, language }: LeadCardProps) {
  const isOverdue = lead.nextFollowup && new Date(lead.nextFollowup) < new Date() && lead.status !== "closed" && lead.status !== "lost";
  const waMessage = [
    `שלום ${lead.name}!`,
    lead.business ? `(${lead.business})` : "",
    ``,
    `רציתי לעקוב אחרי השיחה שלנו.`,
    ``,
    `מצפה לשמוע ממך 🙏`,
  ].filter(Boolean).join("\n");

  return (
    <div className={`rounded-lg border ${col.border} bg-background p-3 space-y-2 shadow-sm hover:shadow-md transition-shadow group`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-foreground leading-tight truncate" dir="auto">{lead.name}</p>
          {lead.business && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5" dir="auto">
              <Building2 className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{lead.business}</span>
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <LeadFormDialog
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2 cursor-pointer">
                  <Pencil className="h-3.5 w-3.5" />
                  {tx({ he: "עריכה", en: "Edit" }, language)}
                </DropdownMenuItem>
              }
              initial={lead}
              onSave={onEdit}
            />
            {COLUMNS.filter((c) => c.id !== lead.status).map((c) => (
              <DropdownMenuItem key={c.id} className="gap-2 cursor-pointer" onSelect={() => onMove(lead.id, c.id)}>
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                {tx(c, language)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              className="gap-2 text-destructive cursor-pointer"
              onSelect={() => onDelete(lead.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {tx({ he: "מחק", en: "Delete" }, language)}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Meta */}
      <div className="space-y-1">
        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            <Phone className="h-2.5 w-2.5 shrink-0" />
            <span dir="ltr">{lead.phone}</span>
          </a>
        )}
        {lead.email && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            <Mail className="h-2.5 w-2.5 shrink-0" />
            <span dir="ltr" className="truncate">{lead.email}</span>
          </p>
        )}
        {lead.value > 0 && (
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
            <DollarSign className="h-2.5 w-2.5 shrink-0 text-emerald-500" />
            ₪{lead.value.toLocaleString()}
          </p>
        )}
        {lead.nextFollowup && (
          <p className={`flex items-center gap-1.5 text-[11px] ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
            <Calendar className="h-2.5 w-2.5 shrink-0" />
            {new Date(lead.nextFollowup).toLocaleDateString(tx({ he: "he-IL", en: "en-US" }, language))}
            {isOverdue && (tx({ he: " — פגה!", en: " — overdue!" }, language))}
          </p>
        )}
      </div>

      {/* Notes */}
      {lead.notes && (
        <p className="text-[10px] text-muted-foreground line-clamp-2 border-t pt-1.5 leading-snug" dir="auto">
          {lead.notes}
        </p>
      )}

      {/* Actions */}
      {(lead.phone || lead.email) && (
        <div className="flex gap-1.5 pt-0.5 flex-wrap">
          {lead.phone && (
            <WhatsAppSendButton
              message={waMessage}
              defaultPhone={lead.phone}
              size="sm"
              label={tx({ he: "WhatsApp", en: "WhatsApp" }, language)}
            />
          )}
          {lead.email && (
            <EmailComposer
              body={`שלום ${lead.name},\n\nרציתי לעקוב אחרי שיחתנו...\n\nבברכה`}
              subject={tx({ he: "המשך שיחתנו", en: "Following up" }, language)}
              size="sm"
              label={tx({ he: "אימייל", en: "Email" }, language)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main CrmPage ─────────────────────────────────────────────────────────────

const CrmPage = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { toast } = useToast();

  const [leads, setLeads] = useState<Lead[]>(loadLeads);
  const [search, setSearch] = useState("");

  const persist = useCallback((next: Lead[]) => {
    setLeads(next);
    saveLeads(next);
  }, []);

  const handleSave = useCallback(
    (lead: Lead) => {
      const existing = leads.find((l) => l.id === lead.id);
      if (existing) {
        persist(leads.map((l) => (l.id === lead.id ? lead : l)));
        toast({ title: tx({ he: "הליד עודכן", en: "Lead updated" }, language) });
      } else {
        persist([lead, ...leads]);
        toast({ title: tx({ he: "ליד חדש נוסף", en: "Lead added" }, language) });
      }
    },
    [leads, persist, toast, language]
  );

  const handleDelete = useCallback(
    (id: string) => {
      persist(leads.filter((l) => l.id !== id));
      toast({ title: tx({ he: "הליד נמחק", en: "Lead deleted" }, language) });
    },
    [leads, persist, toast, language]
  );

  const handleMove = useCallback(
    (id: string, status: LeadStatus) => {
      persist(leads.map((l) => (l.id === id ? { ...l, status } : l)));
    },
    [leads, persist]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.business.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.email.toLowerCase().includes(q)
    );
  }, [leads, search]);

  // Summary metrics
  const totalValue = leads.filter((l) => l.status === "closed").reduce((s, l) => s + (l.value || 0), 0);
  const openValue = leads.filter((l) => !["closed", "lost"].includes(l.status)).reduce((s, l) => s + (l.value || 0), 0);
  const overdueCount = leads.filter((l) => l.nextFollowup && new Date(l.nextFollowup) < new Date() && !["closed", "lost"].includes(l.status)).length;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-4 pb-16 max-w-7xl">
        <BackToHub currentPage={tx({ he: "CRM", en: "CRM" }, language)} />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" dir="auto">
              <Users className="h-5 w-5 text-primary" />
              {tx({ he: "ניהול לידים", en: "Lead Management" }, language)}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5" dir="auto">
              {leads.length} {tx({ he: "לידים סה״כ", en: "leads total" }, language)}
            </p>
          </div>
          <LeadFormDialog
            trigger={
              <Button className="gap-2" size="sm">
                <Plus className="h-4 w-4" />
                {tx({ he: "ליד חדש", en: "New Lead" }, language)}
              </Button>
            }
            onSave={handleSave}
          />
        </div>

        {/* Metrics bar */}
        {leads.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="rounded-lg border bg-green-50 dark:bg-green-900/20 px-3 py-2 text-center min-w-[100px]">
              <p className="text-xs text-muted-foreground" dir="auto">{tx({ he: "סגור", en: "Closed" }, language)}</p>
              <p className="font-bold text-green-600 text-sm">₪{totalValue.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-center min-w-[100px]">
              <p className="text-xs text-muted-foreground" dir="auto">{tx({ he: "צינור פתוח", en: "Open pipeline" }, language)}</p>
              <p className="font-bold text-blue-600 text-sm">₪{openValue.toLocaleString()}</p>
            </div>
            {overdueCount > 0 && (
              <div className="rounded-lg border bg-red-50 dark:bg-red-900/20 px-3 py-2 text-center min-w-[100px]">
                <p className="text-xs text-muted-foreground" dir="auto">{tx({ he: "פולואפ פגה", en: "Overdue" }, language)}</p>
                <p className="font-bold text-red-500 text-sm">{overdueCount}</p>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <Input
            dir="auto"
            placeholder={tx({ he: "חיפוש לפי שם, עסק, טלפון...", en: "Search by name, business, phone..." }, language)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Empty state */}
        {leads.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <Users className="h-16 w-16 text-muted-foreground/30 mx-auto" />
            <div>
              <p className="font-medium text-foreground" dir="auto">
                {tx({ he: "עדיין אין לידים", en: "No leads yet" }, language)}
              </p>
              <p className="text-sm text-muted-foreground" dir="auto">
                {tx({ he: "הוסף ליד ראשון כדי להתחיל לנהל את הצינור שלך", en: "Add your first lead to start managing your pipeline" }, language)}
              </p>
            </div>
            <LeadFormDialog
              trigger={
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {tx({ he: "הוסף ליד ראשון", en: "Add first lead" }, language)}
                </Button>
              }
              onSave={handleSave}
            />
          </div>
        )}

        {/* Kanban board */}
        {leads.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 overflow-x-auto">
            {COLUMNS.map((col) => {
              const colLeads = filtered.filter((l) => l.status === col.id);
              const colValue = colLeads.reduce((s, l) => s + (l.value || 0), 0);
              return (
                <div key={col.id} className="flex flex-col gap-2 min-w-[200px]">
                  {/* Column header */}
                  <div className={`rounded-lg px-3 py-2 ${col.bg} border ${col.border}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${col.color}`} dir="auto">
                        {tx(col, language)}
                      </span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${col.color} border-current`}>
                        {colLeads.length}
                      </Badge>
                    </div>
                    {colValue > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        ₪{colValue.toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Lead cards */}
                  <div className="space-y-2 flex-1">
                    {colLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        col={col}
                        onEdit={handleSave}
                        onDelete={handleDelete}
                        onMove={handleMove}
                        isHe={isHe}
                        language={language}
                      />
                    ))}
                  </div>

                  {/* Add to column */}
                  <LeadFormDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`w-full justify-start gap-1.5 text-[11px] ${col.color} hover:${col.bg} opacity-60 hover:opacity-100`}
                      >
                        <Plus className="h-3 w-3" />
                        {tx({ he: "הוסף ליד", en: "Add lead" }, language)}
                      </Button>
                    }
                    defaultStatus={col.id}
                    onSave={handleSave}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default CrmPage;
