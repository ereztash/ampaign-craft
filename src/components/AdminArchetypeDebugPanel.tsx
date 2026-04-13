// ═══════════════════════════════════════════════
// AdminArchetypeDebugPanel — Owner-only Glass Box
// Full visibility into the archetype classification:
// scores, signals, blackboard influence, manual override.
// Rendered only when user.role === "owner".
// ═══════════════════════════════════════════════

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChevronDown, RotateCcw, AlertTriangle } from "lucide-react";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ArchetypeId } from "@/types/archetype";

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

const ARCHETYPE_IDS: ArchetypeId[] = ["strategist", "optimizer", "pioneer", "connector", "closer"];

const ARCHETYPE_LABELS: Record<ArchetypeId, { he: string; en: string }> = {
  strategist: { he: "האסטרטג", en: "Strategist" },
  optimizer:  { he: "האופטימייזר", en: "Optimizer" },
  pioneer:    { he: "החלוץ", en: "Pioneer" },
  connector:  { he: "המחבר", en: "Connector" },
  closer:     { he: "הסגרן", en: "Closer" },
};

const ARCHETYPE_COLORS: Record<ArchetypeId, string> = {
  strategist: "#1e40af",
  optimizer:  "#0d9488",
  pioneer:    "#7c3aed",
  connector:  "#059669",
  closer:     "#dc2626",
};

const TIER_COLORS: Record<string, string> = {
  none:      "secondary",
  tentative: "outline",
  confident: "default",
  strong:    "default",
};

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function confidencePercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "text-green-600 dark:text-green-400";
  if (confidence >= 0.65) return "text-blue-600 dark:text-blue-400";
  if (confidence >= 0.5) return "text-amber-500";
  return "text-muted-foreground";
}

// ═══════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════

interface AdminArchetypeDebugPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminArchetypeDebugPanel({ open, onOpenChange }: AdminArchetypeDebugPanelProps) {
  const { profile, uiConfig, effectiveArchetypeId, confidenceTier, setOverride } = useArchetype();
  const { language } = useLanguage();
  const isHe = language === "he";

  const chartData = ARCHETYPE_IDS.map((id) => ({
    name: ARCHETYPE_LABELS[id][isHe ? "he" : "en"],
    id,
    score: profile.scores[id] ?? 0,
  }));

  const recentSignals = [...profile.signalHistory].reverse().slice(0, 20);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isHe ? "left" : "right"}
        className="w-[480px] max-w-full overflow-y-auto"
        dir={isHe ? "rtl" : "ltr"}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base">
            🧠 {isHe ? "פאנל ניפוי ארכיטיפ" : "Archetype Debug Panel"}
            <Badge variant="outline" className="text-xs font-mono">owner only</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">

          {/* ── 1. Classification summary ── */}
          <section className="rounded-lg border border-border p-4 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {isHe ? "סיכום סיווג" : "Classification Summary"}
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-lg font-bold">
                {ARCHETYPE_LABELS[effectiveArchetypeId][isHe ? "he" : "en"]}
              </span>
              <Badge variant={TIER_COLORS[confidenceTier] as "default" | "secondary" | "outline"}>
                {confidenceTier}
              </Badge>
              {profile.overrideByUser && (
                <Badge variant="destructive" className="text-xs">
                  {isHe ? "עקיפה ידנית פעילה" : "Manual override active"}
                </Badge>
              )}
            </div>
            <div className={`text-2xl font-bold tabular-nums ${confidenceColor(profile.confidence)}`}>
              {confidencePercent(profile.confidence)}
              <span className="text-sm font-normal text-muted-foreground ms-2">
                {isHe ? "ביטחון" : "confidence"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {isHe ? "סשנים שנצברו:" : "Sessions accumulated:"}{" "}
              <strong>{profile.sessionCount}</strong>
              {" · "}
              {isHe ? "עודכן:" : "Updated:"}{" "}
              {new Date(profile.lastComputedAt).toLocaleString(isHe ? "he-IL" : "en-US")}
            </div>
          </section>

          {/* ── 2. Score distribution chart ── */}
          <section className="rounded-lg border border-border p-4 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {isHe ? "פיזור ציונים" : "Score Distribution"}
            </h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ fontSize: 11 }}
                  formatter={(val: number) => [val, isHe ? "ציון" : "Score"]}
                />
                <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={ARCHETYPE_COLORS[entry.id]}
                      opacity={entry.id === effectiveArchetypeId ? 1 : 0.4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* ── 3. Signal breakdown table ── */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/40">
                {isHe ? "פירוט סיגנלים" : "Signal Breakdown"}
                <ChevronDown className="h-4 w-4" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 rounded-b-lg border border-t-0 border-border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-2 py-1.5 text-start font-medium">{isHe ? "מקור" : "Source"}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{isHe ? "שדה" : "Field"}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{isHe ? "ערך" : "Value"}</th>
                      <th className="px-2 py-1.5 text-center font-medium">S</th>
                      <th className="px-2 py-1.5 text-center font-medium">O</th>
                      <th className="px-2 py-1.5 text-center font-medium">P</th>
                      <th className="px-2 py-1.5 text-center font-medium">C</th>
                      <th className="px-2 py-1.5 text-center font-medium">Cl</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSignals.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-2 py-3 text-center text-muted-foreground">
                          {isHe ? "אין סיגנלים עדיין" : "No signals yet"}
                        </td>
                      </tr>
                    ) : (
                      recentSignals.map((sig, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-2 py-1 font-mono text-muted-foreground">{sig.source}</td>
                          <td className="px-2 py-1 font-mono max-w-[100px] truncate">{sig.field}</td>
                          <td className="px-2 py-1 max-w-[60px] truncate">{String(sig.value)}</td>
                          {(["strategist", "optimizer", "pioneer", "connector", "closer"] as ArchetypeId[]).map((id) => {
                            const delta = sig.deltas[id];
                            return (
                              <td key={id} className={`px-2 py-1 text-center tabular-nums ${delta ? "font-medium text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                                {delta ? `+${delta}` : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── 4. Active UI config preview ── */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/40">
                {isHe ? "תצורת UI פעילה" : "Active UI Config"}
                <ChevronDown className="h-4 w-4" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 rounded-b-lg border border-t-0 border-border p-3 space-y-2 text-xs">
                <div className="flex gap-2">
                  <Badge variant="outline">{uiConfig.informationDensity}</Badge>
                  <Badge variant="outline">{uiConfig.ctaTone}</Badge>
                  <Badge variant="outline">{isHe ? "ברירת מחדל:" : "Default tab:"} {uiConfig.defaultTab}</Badge>
                </div>
                <div>
                  <p className="font-medium mb-1 text-muted-foreground">{isHe ? "סדר workspace:" : "Workspace order:"}</p>
                  <p className="font-mono">{uiConfig.workspaceOrder.join(" → ")}</p>
                </div>
                <div>
                  <p className="font-medium mb-1 text-muted-foreground">{isHe ? "סדר מודולים:" : "Modules order:"}</p>
                  <p className="font-mono">{uiConfig.modulesOrder.join(" → ")}</p>
                </div>
                <div>
                  <p className="font-medium mb-1 text-muted-foreground">{isHe ? "עדיפויות טאבים:" : "Tab priorities:"}</p>
                  <p className="font-mono">
                    {Object.entries(uiConfig.tabPriorityOverrides)
                      .sort((a, b) => (a[1] as number) - (b[1] as number))
                      .map(([k, v]) => `${k}:${v}`)
                      .join(", ")}
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── 5. Manual override ── */}
          <section className="rounded-lg border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {isHe ? "עקיפה ידנית" : "Manual Override"}
            </h3>
            {profile.overrideByUser && (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {isHe ? "עקיפה ידנית פעילה — הסיווג האוטומטי מושהה" : "Manual override active — automatic classification paused"}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Select
                value={profile.overrideByUser ?? "auto"}
                onValueChange={(val) => setOverride(val === "auto" ? null : val as ArchetypeId)}
              >
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{isHe ? "אוטומטי (מבוסס נתונים)" : "Automatic (data-driven)"}</SelectItem>
                  {ARCHETYPE_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {ARCHETYPE_LABELS[id][isHe ? "he" : "en"]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {profile.overrideByUser && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setOverride(null)}
                  title={isHe ? "אפס עקיפה" : "Reset override"}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </section>

        </div>
      </SheetContent>
    </Sheet>
  );
}
