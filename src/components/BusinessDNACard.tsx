import { useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/i18n/tx";
import {
  BusinessFingerprint,
  FingerprintDimensions,
  DIMENSION_LABELS,
  ARCHETYPE_LABELS,
} from "@/engine/businessFingerprintEngine";

interface BusinessDNACardProps {
  fingerprint: BusinessFingerprint;
  compact?: boolean;
}

const DIMENSION_KEYS: (keyof FingerprintDimensions)[] = [
  "priceComplexity",
  "salesCycleLength",
  "competitiveIntensity",
  "customerLifetimeValue",
  "acquisitionComplexity",
  "brandDependency",
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildRadarPath(values: number[], cx: number, cy: number, maxR: number): string {
  return values
    .map((v, i) => {
      const angle = (360 / values.length) * i;
      const { x, y } = polarToCartesian(cx, cy, maxR * v, angle);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ") + " Z";
}

const RadarChart = ({ dimensions }: { dimensions: FingerprintDimensions }) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const cx = 100;
  const cy = 100;
  const maxR = 80;
  const values = DIMENSION_KEYS.map((k) => dimensions[k]);

  const dataPath = useMemo(() => buildRadarPath(values, cx, cy, maxR), [values]);

  const gridLevels = [0.25, 0.5, 0.75, 1];

  const sorted = useMemo(
    () => [...DIMENSION_KEYS].sort((a, b) => dimensions[b] - dimensions[a]),
    [dimensions],
  );
  const topKey = sorted[0];
  const bottomKey = sorted[sorted.length - 1];
  const chartLabel = tx({ he: "טביעת אצבע עסקית — מפת מאפיינים", en: "Business DNA — dimension radar chart" }, language);
  const chartDesc = isHe
    ? `ממד חזק: ${DIMENSION_LABELS[topKey].he} (${Math.round(dimensions[topKey] * 100)}%). ממד חלש: ${DIMENSION_LABELS[bottomKey].he} (${Math.round(dimensions[bottomKey] * 100)}%).`
    : `Strongest: ${DIMENSION_LABELS[topKey].en} (${Math.round(dimensions[topKey] * 100)}%). Weakest: ${DIMENSION_LABELS[bottomKey].en} (${Math.round(dimensions[bottomKey] * 100)}%).`;

  return (
    <>
      <svg
        viewBox="0 0 200 200"
        className="w-full max-w-[200px] mx-auto"
        role="img"
        aria-label={chartLabel}
      >
        <title>{chartLabel}</title>
        <desc>{chartDesc}</desc>
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={DIMENSION_KEYS.map((_, i) => {
              const angle = (360 / DIMENSION_KEYS.length) * i;
              const { x, y } = polarToCartesian(cx, cy, maxR * level, angle);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-border"
          />
        ))}

        {DIMENSION_KEYS.map((_, i) => {
          const angle = (360 / DIMENSION_KEYS.length) * i;
          const { x, y } = polarToCartesian(cx, cy, maxR, angle);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-border"
            />
          );
        })}

        <path d={dataPath} fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2" />

        {DIMENSION_KEYS.map((k, i) => {
          const angle = (360 / DIMENSION_KEYS.length) * i;
          const { x, y } = polarToCartesian(cx, cy, maxR + 18, angle);
          return (
            <text
              key={k}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-muted-foreground"
              fontSize="6"
              aria-hidden="true"
            >
              {DIMENSION_LABELS[k][language]}
            </text>
          );
        })}
      </svg>

      {/* Screen-reader text alternative for the radar chart */}
      <table className="sr-only">
        <caption>{tx({ he: "ערכי מאפיינים עסקיים", en: "Business dimension values" }, language)}</caption>
        <thead>
          <tr>
            <th scope="col">{tx({ he: "מאפיין", en: "Dimension" }, language)}</th>
            <th scope="col">{tx({ he: "ערך", en: "Value" }, language)}</th>
          </tr>
        </thead>
        <tbody>
          {DIMENSION_KEYS.map((k) => (
            <tr key={k}>
              <td>{DIMENSION_LABELS[k][language]}</td>
              <td>{Math.round(dimensions[k] * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

const BusinessDNACard = ({ fingerprint, compact }: BusinessDNACardProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const archLabel = ARCHETYPE_LABELS[fingerprint.archetype][language];

  const modeLabel =
    fingerprint.marketMode === "b2b"
      ? "B2B"
      : fingerprint.marketMode === "b2c"
        ? "B2C"
        : isHe
          ? "משולב"
          : "Hybrid";

  const stageLabels: Record<string, { he: string; en: string }> = {
    "pre-launch": { he: "טרום-השקה", en: "Pre-launch" },
    early: { he: "שלב מוקדם", en: "Early Stage" },
    growth: { he: "צמיחה", en: "Growth" },
    mature: { he: "בשל", en: "Mature" },
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className={compact ? "p-3" : "p-5"}>
        <div className="text-center mb-3">
          <h3 className="font-bold text-foreground text-sm" dir="auto">
            {tx({ he: "טביעת האצבע העסקית שלך", en: "Your Business DNA" }, language)}
          </h3>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <Badge variant="default" className="text-xs">
              {archLabel}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {modeLabel}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {stageLabels[fingerprint.growthStage]?.[language] || fingerprint.growthStage}
            </Badge>
          </div>
        </div>

        {!compact && <RadarChart dimensions={fingerprint.dimensions} />}

        {compact && (
          <div className="grid grid-cols-3 gap-1 mt-2">
            {DIMENSION_KEYS.map((k) => (
              <div key={k} className="text-center">
                <div className="text-xs text-muted-foreground">{DIMENSION_LABELS[k][language]}</div>
                <div className="text-sm font-bold text-primary">
                  {Math.round(fingerprint.dimensions[k] * 100)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BusinessDNACard;
