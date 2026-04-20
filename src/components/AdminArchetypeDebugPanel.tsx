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
import { tx } from "@/i18n/tx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChevronDown, RotateCcw, AlertTriangle } from "lucide-react";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ArchetypeId } from "@/types/archetype";
import { deriveHeuristicSet } from "@/engine/behavioralHeuristicEngine";

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
    name: ARCHETYPE_LABELS[id][tx({ he: "he", en: "en" }, language)],
    id,
    score: profile.scores[id] ?? 0,
  }));

  const recentSignals = [...profile.signalHistory].reverse().slice(0, 20);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={tx({ he: "left", en: "right" }, language)}
        className="w-[480px] max-w-full overflow-y-auto"
        dir={tx({ he: "rtl", en: "ltr" }, language)}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base">
            🧠 {tx({ he: "פאנל ניפוי ארכיטיפ", en: "Archetype Debug Panel" }, language)}
            <Badge variant="outline" className="text-xs font-mono">owner only</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">

          {/* ── 1. Classification summary ── */}
          <section className="rounded-lg border border-border p-4 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {tx({ he: "סיכום סיווג", en: "Classification Summary" }, language)}
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-lg font-bold">
                {ARCHETYPE_LABELS[effectiveArchetypeId][tx({ he: "he", en: "en" }, language)]}
              </span>
              <Badge variant={TIER_COLORS[confidenceTier] as "default" | "secondary" | "outline"}>
                {confidenceTier}
              </Badge>
              {profile.overrideByUser && (
                <Badge variant="destructive" className="text-xs">
                  {tx({ he: "עקיפה ידנית פעילה", en: "Manual override active" }, language)}
                </Badge>
              )}
            </div>
            <div className={`text-2xl font-bold tabular-nums ${confidenceColor(profile.confidence)}`}>
              {confidencePercent(profile.confidence)}
              <span className="text-sm font-normal text-muted-foreground ms-2">
                {tx({ he: "ביטחון", en: "confidence" }, language)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {tx({ he: "סשנים שנצברו:", en: "Sessions accumulated:" }, language)}{" "}
              <strong>{profile.sessionCount}</strong>
              {" · "}
              {tx({ he: "עודכן:", en: "Updated:" }, language)}{" "}
              {new Date(profile.lastComputedAt).toLocaleString(tx({ he: "he-IL", en: "en-US" }, language))}
            </div>
          </section>

          {/* ── 2. Score distribution chart ── */}
          <section className="rounded-lg border border-border p-4 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {tx({ he: "פיזור ציונים", en: "Score Distribution" }, language)}
            </h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ fontSize: 11 }}
                  formatter={(val: number) => [val, tx({ he: "ציון", en: "Score" }, language)]}
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
                {tx({ he: "פירוט סיגנלים", en: "Signal Breakdown" }, language)}
                <ChevronDown className="h-4 w-4" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 rounded-b-lg border border-t-0 border-border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-2 py-1.5 text-start font-medium">{tx({ he: "מקור", en: "Source" }, language)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{tx({ he: "שדה", en: "Field" }, language)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{tx({ he: "ערך", en: "Value" }, language)}</th>
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
                          {tx({ he: "אין סיגנלים עדיין", en: "No signals yet" }, language)}
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
                {tx({ he: "תצורת UI פעילה", en: "Active UI Config" }, language)}
                <ChevronDown className="h-4 w-4" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 rounded-b-lg border border-t-0 border-border p-3 space-y-2 text-xs">
                <div className="flex gap-2">
                  <Badge variant="outline">{uiConfig.informationDensity}</Badge>
                  <Badge variant="outline">{uiConfig.ctaTone}</Badge>
                  <Badge variant="outline">{tx({ he: "ברירת מחדל:", en: "Default tab:" }, language)} {uiConfig.defaultTab}</Badge>
                </div>
                <div>
                  <p className="font-medium mb-1 text-muted-foreground">{tx({ he: "סדר workspace:", en: "Workspace order:" }, language)}</p>
                  <p className="font-mono">{uiConfig.workspaceOrder.join(" → ")}</p>
                </div>
                <div>
                  <p className="font-medium mb-1 text-muted-foreground">{tx({ he: "סדר מודולים:", en: "Modules order:" }, language)}</p>
                  <p className="font-mono">{uiConfig.modulesOrder.join(" → ")}</p>
                </div>
                <div>
                  <p className="font-medium mb-1 text-muted-foreground">{tx({ he: "עדיפויות טאבים:", en: "Tab priorities:" }, language)}</p>
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

          {/* ── 3b. Active Heuristics (Glass-Box) ── */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/40">
                {tx({ he: "היוריסטיקות פעילות", en: "Active Heuristics" }, language)}
                <ChevronDown className="h-4 w-4" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 rounded-b-lg border border-t-0 border-border p-3 space-y-3">
                {deriveHeuristicSet(effectiveArchetypeId).activeHeuristics.map((h) => (
                  <div key={h.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-primary">{h.id}</span>
                      <span className="text-xs font-semibold">{h.principle}</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">{h.source}</p>
                    <div className="space-y-0.5">
                      {(["L1_navigation", "L2_layout", "L3_component", "L4_content", "L5_interaction"] as const).map((lvl) => (
                        <div key={lvl} className="flex gap-2 text-xs">
                          <span className="font-mono text-muted-foreground/60 shrink-0 w-6">{lvl.split("_")[0]}</span>
                          <span className="text-muted-foreground">{h.manifestations[lvl]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── 3c. Feature Importance (Glass-Box ML pattern) ── */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/40">
                {tx({ he: "חשיבות פיצ'רים", en: "Feature Importance" }, language)}
                <ChevronDown className="h-4 w-4" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 rounded-b-lg border border-t-0 border-border p-3 space-y-2">
                {(() => {
                  // Aggregate signal deltas by source
                  const totals: Record<string, number> = {};
                  for (const sig of profile.signalHistory) {
                    const delta = Object.values(sig.deltas).reduce((s, v) => s + (v ?? 0), 0);
                    totals[sig.source] = (totals[sig.source] ?? 0) + delta;
                  }
                  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
                  const totalContrib = sorted.reduce((s, [, v]) => s + v, 0);
                  if (sorted.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground">{tx({ he: "אין סיגנלים עדיין", en: "No signals yet" }, language)}</p>
                    );
                  }
                  return sorted.map(([source, value]) => {
                    const pct = totalContrib > 0 ? Math.round((value / totalContrib) * 100) : 0;
                    return (
                      <div key={source} className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-muted-foreground">{source}</span>
                          <span className="font-medium">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── 3d. Classification Rule (Glass-Box formula) ── */}
          <section className="rounded-lg border border-border p-4 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {tx({ he: "כלל סיווג", en: "Classification Rule" }, language)}
            </h3>
            {(() => {
              const sorted = (Object.entries(profile.scores) as [ArchetypeId, number][])
                .sort((a, b) => b[1] - a[1]);
              const total = sorted.reduce((s, [, v]) => s + v, 0);
              const top = sorted[0];
              const second = sorted[1];
              return (
                <div className="space-y-1 text-xs font-mono">
                  <p className="text-muted-foreground">
                    confidence = (top − 2nd) ÷ Σscores
                  </p>
                  <p className="text-foreground">
                    = ({top?.[1] ?? 0} − {second?.[1] ?? 0}) ÷ {total} ={" "}
                    <strong className={confidenceColor(profile.confidence)}>
                      {confidencePercent(profile.confidence)}
                    </strong>
                  </p>
                  <div className="flex gap-3 mt-2 text-muted-foreground">
                    <span className={profile.confidenceTier === "tentative" ? "text-amber-500 font-bold" : ""}>tentative ≥ 50%</span>
                    <span className={profile.confidenceTier === "confident" ? "text-blue-500 font-bold" : ""}>confident ≥ 65%</span>
                    <span className={profile.confidenceTier === "strong" ? "text-green-500 font-bold" : ""}>strong ≥ 80%</span>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* ── 5. Manual override ── */}
          <section className="rounded-lg border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {tx({ he: "עקיפה ידנית", en: "Manual Override" }, language)}
            </h3>
            {profile.overrideByUser && (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {tx({ he: "עקיפה ידנית פעילה. הסיווג האוטומטי מושהה", en: "Manual override active. Automatic classification paused" }, language)}
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
                  <SelectItem value="auto">{tx({ he: "אוטומטי (מבוסס נתונים)", en: "Automatic (data-driven)" }, language)}</SelectItem>
                  {ARCHETYPE_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {ARCHETYPE_LABELS[id][tx({ he: "he", en: "en" }, language)]}
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
                  title={tx({ he: "אפס עקיפה", en: "Reset override" }, language)}
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
