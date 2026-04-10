// ═══════════════════════════════════════════════
// ReflectiveCard — single-action reflective surface
//
// Presentational only. Takes a pre-computed ActionCard and renders
// it in three fixed vertical rows:
//   1) Signal Row  (32px) — colored dot + signal label
//   2) Cause Row   (flexible, max 3 lines) — why text
//   3) Action Row  (64px) — next_step text
//
// No icons beyond the dot. No buttons. No "read more". 200ms fade-in.
// RTL. Total height < 200px.
//
// Empty state: if coherence_score < 0.6, only the Signal Row is shown
// and colored with the watch palette.
// ═══════════════════════════════════════════════

import { useEffect, useState } from "react";
import type { ActionCard, ActionSignal } from "@/engine/optimization/reflectiveAction";

interface ReflectiveCardProps {
  card: ActionCard;
}

// COR-SYS palette — literal hex values so the card reads the same in
// any host theme (no tailwind tokens).
const PALETTE: Record<ActionSignal, string> = {
  stable: "#2F7D5B",
  watch: "#B87333",
  act: "#7A1F1F",
};

const TEXT = "#111317";
const BACKGROUND = "#FAFAF8";
const BORDER = "#E5E3DE";

const SIGNAL_LABEL: Record<ActionSignal, string> = {
  stable: "יציב",
  watch: "עקוב",
  act: "פעל",
};

const ReflectiveCard = ({ card }: ReflectiveCardProps) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 10);
    return () => window.clearTimeout(timer);
  }, []);

  const color = PALETTE[card.signal];
  const isEmptyState = card.coherence_score < 0.6;

  return (
    <div
      dir="rtl"
      role="status"
      aria-label={`${SIGNAL_LABEL[card.signal]}: ${card.headline}`}
      style={{
        display: "flex",
        flexDirection: "column",
        maxWidth: "520px",
        marginInlineStart: "auto",
        marginInlineEnd: "auto",
        padding: "12px 16px",
        background: BACKGROUND,
        border: `1px solid ${BORDER}`,
        borderRadius: "6px",
        fontFamily: "inherit",
        color: TEXT,
        opacity: mounted ? 1 : 0,
        transition: "opacity 200ms ease-in",
      }}
    >
      {/* Signal Row — 32px */}
      <div
        style={{
          height: "32px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "14px",
          fontWeight: 500,
          lineHeight: 1.2,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: "10px",
            height: "10px",
            borderRadius: "5px",
            background: color,
          }}
        />
        <span style={{ color }}>{SIGNAL_LABEL[card.signal]}</span>
        {!isEmptyState && (
          <span style={{ color: TEXT, fontWeight: 600 }}>{card.headline}</span>
        )}
      </div>

      {!isEmptyState && (
        <>
          {/* Cause Row — flexible, clamped to 3 lines */}
          <div
            style={{
              marginTop: "8px",
              fontSize: "14px",
              fontWeight: 400,
              lineHeight: 1.45,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {card.why}
          </div>

          {/* Action Row — 64px */}
          <div
            style={{
              height: "64px",
              marginTop: "8px",
              display: "flex",
              alignItems: "center",
              fontSize: "13px",
              fontWeight: 500,
              lineHeight: 1.3,
              color: TEXT,
              borderTop: `1px solid ${BORDER}`,
              paddingTop: "8px",
            }}
          >
            {card.next_step}
          </div>
        </>
      )}
    </div>
  );
};

export default ReflectiveCard;
