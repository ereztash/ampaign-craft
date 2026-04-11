// ═══════════════════════════════════════════════
// SentinelPulse — transparent system-state indicator
//
// A single dot + three words: "המערכת זורמת" / "המערכת בלחץ" /
// "המערכת עצרה, נדרשת התערבות". Polls `sentinel_view` every
// 15 seconds, derives a tri-state from the last batch of SYSTEM-*
// events, and fades between states. No numbers, no tooltips, no
// graphs, no icons beyond the dot itself.
//
// The component is self-contained: it does not take props and
// does not mount anything else. If the view has no rows, the
// component renders nothing — there is no loading spinner and
// no error state on screen.
//
// Clicking the dot opens a minimal drawer with up to 5 recent
// SYSTEM-* events, rendered as plain rows: concept_key + relative
// time. The drawer closes on Escape or click-outside — no close
// button, by spec.
// ═══════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

type PulseState = "healthy" | "pressure" | "halt";

interface SentinelRow {
  id: string;
  concept_key: string;
  created_at: string;
  stage: string | null;
  payload: Record<string, unknown> | null;
}

// Bilingual copy — only Hebrew is shown, but we keep English as a
// fallback for any consumer that mounts this page under `lang="en"`.
const COPY: Record<PulseState, { he: string; en: string }> = {
  healthy: { he: "המערכת זורמת", en: "System flowing" },
  pressure: { he: "המערכת בלחץ", en: "System under pressure" },
  halt: {
    he: "המערכת עצרה, נדרשת התערבות",
    en: "System halted, intervention required",
  },
};

const SIGNAL_CLASSES = {
  healthy: { dot: "bg-emerald-600 dark:bg-emerald-400", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  pressure: { dot: "bg-amber-600 dark:bg-amber-400", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-900/20" },
  halt: { dot: "bg-red-700 dark:bg-red-400", text: "text-red-700 dark:text-red-300", bg: "bg-red-50 dark:bg-red-900/20" },
} as const;

const POLL_INTERVAL_MS = 15_000;
const ROW_FETCH_LIMIT = 20; // enough to derive V and C, we only display 5
const DEFAULT_EPSILON = 0.05;
const DEFAULT_KAPPA = 0.3;

const SentinelPulse = () => {
  const { language } = useLanguage();
  const [rows, setRows] = useState<SentinelRow[] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dotWrapRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const fetchRows = useCallback(async () => {
    try {
      const supa = supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            order: (
              col: string,
              opts: { ascending: boolean },
            ) => {
              limit: (n: number) => Promise<{
                data: SentinelRow[] | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };

      const { data, error } = await supa
        .from("sentinel_view")
        .select("id, concept_key, created_at, stage, payload")
        .order("created_at", { ascending: false })
        .limit(ROW_FETCH_LIMIT);

      if (error) {
        setRows([]);
        return;
      }
      setRows(data ?? []);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await fetchRows();
    };
    void run();
    const interval = window.setInterval(() => {
      void run();
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [fetchRows]);

  // Click-outside and Escape handlers for the drawer. No explicit
  // close button by spec.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (drawerRef.current?.contains(target)) return;
      if (dotWrapRef.current?.contains(target)) return;
      setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [drawerOpen]);

  const state: PulseState | null = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    return deriveState(rows);
  }, [rows]);

  // Spec: if there is no data, the component is not shown at all.
  if (state === null) return null;

  const signalCls = SIGNAL_CLASSES[state];
  const label = COPY[state][language];

  return (
    <>
      <button
        ref={dotWrapRef}
        type="button"
        onClick={() => setDrawerOpen((open) => !open)}
        aria-label={label}
        dir="auto"
        className="inline-flex items-center gap-2.5 h-12 px-3 bg-card border-none cursor-pointer text-sm font-normal leading-tight text-card-foreground transition-opacity duration-[800ms] ease-in-out"
      >
        <span
          aria-hidden="true"
          className={`inline-block w-2 h-2 rounded-full transition-colors duration-[800ms] ease-in-out ${signalCls.dot} ${state === "halt" ? "animate-[sentinel-pulse_2s_ease-in-out_infinite]" : ""}`}
        />
        <span>{label}</span>
        <style>{`
          @keyframes sentinel-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.9; }
          }
        `}</style>
      </button>

      {drawerOpen && (
        <div
          ref={drawerRef}
          role="dialog"
          aria-label={label}
          dir="auto"
          className="fixed top-14 end-3 min-w-[280px] max-w-[360px] px-4 py-3 bg-card text-card-foreground border rounded shadow-lg z-50 text-[13px] font-normal leading-snug"
        >
          {rows && rows.length > 0 ? (
            rows.slice(0, 5).map((row) => (
              <div
                key={row.id}
                className="py-1.5 border-b flex justify-between gap-3"
              >
                <span className="text-card-foreground break-words">
                  {row.concept_key}
                </span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {formatRelativeTime(row.created_at)}
                </span>
              </div>
            ))
          ) : null}
        </div>
      )}
    </>
  );
};

export default SentinelPulse;

// ───────────────────────────────────────────────
// Internals
// ───────────────────────────────────────────────

/**
 * Tri-state derivation from the latest SYSTEM-* rows.
 *
 * Computes V and C locally so the UI has no dependency on the
 * backend Sentinel rail or EDP module.
 *
 *   healthy  → V ≥ ε AND C ≥ κ
 *   pressure → V < ε OR  C < κ (exactly one is below)
 *   halt     → V < ε AND C < κ
 */
function deriveState(rows: SentinelRow[]): PulseState {
  const events = rows.map((row) => ({
    ts: new Date(row.created_at).getTime(),
    conceptKey: row.concept_key,
  }));
  const v = computeVLocal(events);
  const c = computeCLocal(events);
  const vLow = v < DEFAULT_EPSILON;
  const cLow = c < DEFAULT_KAPPA;
  if (vLow && cLow) return "halt";
  if (vLow || cLow) return "pressure";
  return "healthy";
}

function computeVLocal(
  events: ReadonlyArray<{ ts: number; conceptKey: string }>,
): number {
  if (events.length < 2) return 0;
  const sorted = [...events].sort((a, b) => a.ts - b.ts);
  let totalDelta = 0;
  let pairs = 0;
  for (let i = 1; i < sorted.length; i++) {
    const delta = sorted[i].ts - sorted[i - 1].ts;
    if (delta > 0) {
      totalDelta += delta;
      pairs++;
    }
  }
  if (pairs === 0) return 0;
  const meanDeltaMs = totalDelta / pairs;
  if (meanDeltaMs <= 0) return 1;
  return 1 / meanDeltaMs;
}

function computeCLocal(
  events: ReadonlyArray<{ conceptKey: string }>,
): number {
  if (events.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const event of events) {
    const segments = event.conceptKey.split("-");
    const key = segments.length >= 2 ? `${segments[0]}-${segments[1]}` : event.conceptKey;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = events.length;
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `לפני ${diffSec} שניות`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `לפני ${diffMin} דקות`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `לפני ${diffHour} שעות`;
  const diffDay = Math.floor(diffHour / 24);
  return `לפני ${diffDay} ימים`;
}
