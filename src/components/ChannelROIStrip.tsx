// ChannelROIStrip — Wedge 7.
// Per-channel real ROI: closeRate × avgValue across leads grouped by
// the lead.source field. Renders only when there are at least 5 closed
// leads and at least 2 distinct sources — below that threshold the
// signal is too noisy to drive allocation decisions.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Lead } from "@/services/leadsService";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { tx } from "@/i18n/tx";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import {
  captureRecommendationShown,
  captureOutcome,
} from "@/engine/outcomeLoopEngine";

interface ChannelStat {
  source: string;
  closed: number;
  lost: number;
  open: number;
  closeRate: number;
  avgValueNIS: number;
  totalValueNIS: number;
}

const MIN_CLOSED_LEADS = 5;
const MIN_DISTINCT_SOURCES = 2;
const MAX_ROWS = 5;

function normalizeSource(s: string): string {
  return s.trim().toLowerCase() || "(unknown)";
}

function computeChannelStats(leads: Lead[]): ChannelStat[] {
  const groups = new Map<string, Lead[]>();
  for (const l of leads) {
    const key = normalizeSource(l.source);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(l);
  }
  const stats: ChannelStat[] = [];
  for (const [source, group] of groups) {
    const closed = group.filter((l) => l.status === "closed");
    const lost = group.filter((l) => l.status === "lost");
    const open = group.length - closed.length - lost.length;
    const decided = closed.length + lost.length;
    const closeRate = decided > 0 ? closed.length / decided : 0;
    const totalValueNIS = closed.reduce((s, l) => s + (l.valueNIS || 0), 0);
    const avgValueNIS = closed.length > 0 ? totalValueNIS / closed.length : 0;
    stats.push({
      source,
      closed: closed.length,
      lost: lost.length,
      open,
      closeRate,
      avgValueNIS,
      totalValueNIS,
    });
  }
  return stats.sort((a, b) => b.totalValueNIS - a.totalValueNIS);
}

interface ChannelROIStripProps {
  leads: Lead[];
}

export function ChannelROIStrip({ leads }: ChannelROIStripProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [recById, setRecById] = useState<Record<string, string>>({});
  const shownRef = useRef(false);

  const stats = useMemo(() => computeChannelStats(leads), [leads]);
  const totalClosed = stats.reduce((s, c) => s + c.closed, 0);
  const distinctWithClosed = stats.filter((s) => s.closed > 0).length;
  const meetsThreshold =
    totalClosed >= MIN_CLOSED_LEADS && distinctWithClosed >= MIN_DISTINCT_SOURCES;

  useEffect(() => {
    if (!meetsThreshold || shownRef.current) return;
    shownRef.current = true;
    const map: Record<string, string> = {};
    for (const s of stats.slice(0, MAX_ROWS)) {
      const id = captureRecommendationShown({
        user_id: user?.id ?? null,
        archetype_id: "unknown",
        confidence_tier: "tentative",
        source: "channel_roi",
        action_id: `channel.${s.source}`,
        action_label_en: `Channel ROI: ${s.source}`,
        context_snapshot: {
          closed: s.closed,
          lost: s.lost,
          close_rate: Number(s.closeRate.toFixed(2)),
          avg_value_nis: Math.round(s.avgValueNIS),
          total_value_nis: Math.round(s.totalValueNIS),
        },
      });
      map[s.source] = id;
    }
    setRecById(map);
  }, [meetsThreshold, stats, user?.id]);

  if (!meetsThreshold) return null;

  const handleAllocate = (s: ChannelStat) => {
    const recId = recById[s.source];
    if (!recId) return;
    captureOutcome(
      recId,
      user?.id ?? null,
      "navigated",
      30,
      Math.round(s.totalValueNIS),
    );
  };

  const handleDeprioritize = (s: ChannelStat) => {
    const recId = recById[s.source];
    if (!recId) return;
    captureOutcome(recId, user?.id ?? null, "dismissed", 30, 0);
  };

  return (
    <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-900/20">
      <div className="flex items-center gap-2 mb-1.5">
        <TrendingUp className="h-3.5 w-3.5 shrink-0 text-blue-600" />
        <p className="text-xs font-semibold text-foreground" dir="auto">
          {tx({ he: "ROI לפי ערוץ", en: "ROI by channel" }, language)}
        </p>
      </div>
      <ul className="space-y-1">
        {stats.slice(0, MAX_ROWS).map((s) => (
          <li
            key={s.source}
            className="flex items-center justify-between gap-2 text-[11px]"
            dir="auto"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium truncate" dir="auto">{s.source}</span>
              <span className="opacity-70 ms-1.5">
                {tx(
                  {
                    he: `${s.closed} סגורים · ${(s.closeRate * 100).toFixed(0)}% · ממוצע ₪${Math.round(s.avgValueNIS).toLocaleString()}`,
                    en: `${s.closed} won · ${(s.closeRate * 100).toFixed(0)}% · avg ₪${Math.round(s.avgValueNIS).toLocaleString()}`,
                  },
                  language,
                )}
              </span>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAllocate(s)}
                className="h-6 px-1.5 text-[10px]"
              >
                {tx({ he: "להגביר", en: "Allocate+" }, language)}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeprioritize(s)}
                className="h-6 px-1.5 text-[10px] text-muted-foreground"
              >
                {tx({ he: "להוריד", en: "Deprioritize" }, language)}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
