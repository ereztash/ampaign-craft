// ═══════════════════════════════════════════════
// Palette Cohorts Dashboard — /admin/palette-cohorts
//
// Shows the (archetype × palette × stage) → conversion lookup.
// Each row represents accumulated A/B data for a palette variant.
// When n≥200 + |Δ|≥5pp + p<0.05: variant is eligible for promotion.
// Protected: requires role=admin.
// ═══════════════════════════════════════════════

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminRole } from "@/lib/roles";
import { supabaseLoose as db } from "@/integrations/supabase/loose";
import { logger } from "@/lib/logger";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PaletteCohortRow {
  archetype_id: string;
  palette_variant_id: string;
  action_id: string;
  horizon_days: number | null;
  n_shown: number;
  conversion_rate_pct: number | null;
  rows_to_promotion: number | null;
  status: string | null;
  refreshed_at: string | null;
}

function PromotionBadge({ row }: { row: PaletteCohortRow }) {
  if (row.status === "eligible_for_review") {
    return <Badge className="bg-accent text-accent-foreground">Eligible for review</Badge>;
  }
  if ((row.rows_to_promotion ?? 999) <= 50) {
    return <Badge variant="outline" className="border-cor-warning text-cor-warning">Almost there</Badge>;
  }
  return <Badge variant="secondary">Accumulating</Badge>;
}

export default function PaletteCohorts() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PaletteCohortRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdminRole(user?.role)) return;

    async function load() {
      try {
        // Query palette_cohort_benchmarks joined with palette_promotion_eta
        const { data, error } = await db
          .from("palette_cohort_benchmarks")
          .select("*")
          .order("archetype_id", { ascending: true })
          .order("n_shown", { ascending: false });

        if (error) throw error;

        // Enrich with ETA data
        const { data: etaData } = await db
          .from("palette_promotion_eta")
          .select("archetype_id, palette_variant_id, action_id, rows_to_promotion, status");

        const etaMap = new Map(
          (etaData ?? []).map((e: { archetype_id: string; palette_variant_id: string; action_id: string; rows_to_promotion: number | null; status: string | null }) =>
            [`${e.archetype_id}:${e.palette_variant_id}:${e.action_id}`, e]
          )
        );

        const enriched = (data ?? []).map((r: PaletteCohortRow) => {
          const eta = etaMap.get(`${r.archetype_id}:${r.palette_variant_id}:${r.action_id}`);
          return { ...r, rows_to_promotion: eta?.rows_to_promotion ?? null, status: eta?.status ?? null };
        });

        setRows(enriched);
        if (enriched.length > 0) {
          setLastRefresh(enriched[0].refreshed_at ?? null);
        }
      } catch (err) {
        logger.error("PaletteCohorts load", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [user?.role]);

  if (!isAdminRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  const totalExposures = rows.reduce((s, r) => s + (r.n_shown ?? 0), 0);
  const eligibleCount = rows.filter((r) => r.status === "eligible_for_review").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Palette Cohorts</h1>
        <p className="text-muted-foreground text-sm mt-1">
          (archetype × palette variant × stage) → conversion lookup.
          Promotion gate: n≥200 + |Δ|≥5pp + p&lt;0.05 + APCA Lc≥60 + CB-safe.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Exposures</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalExposures.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Eligible for Promotion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">{eligibleCount}</p>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <p className="text-muted-foreground text-sm">Loading cohort data…</p>
      )}

      {!loading && rows.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No palette cohort data yet. Data accumulates once users are assigned
              to palette variants via <code className="text-xs">useAdaptiveTheme</code>.
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              T+30d check: target ≥5 rows with n&gt;30. See docs/knowledge-and-moat.md.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cohort Data</CardTitle>
            {lastRefresh && (
              <p className="text-xs text-muted-foreground">
                Last refresh: {new Date(lastRefresh).toLocaleString()}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Archetype</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-right">N Shown</TableHead>
                    <TableHead className="text-right">Conv. %</TableHead>
                    <TableHead className="text-right">Rows to Promo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium capitalize">{row.archetype_id}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {row.palette_variant_id}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.action_id}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{row.n_shown}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.conversion_rate_pct != null ? `${row.conversion_rate_pct}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.rows_to_promotion != null ? row.rows_to_promotion : "—"}
                      </TableCell>
                      <TableCell>
                        <PromotionBadge row={row} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Promotion criteria: n≥200 per arm · |Δ conversion|≥5pp · p&lt;0.05 · APCA Lc≥60 · CB-safe.
        See <code>docs/knowledge-and-moat.md § Brand-Asset Moat</code> for the full process.
      </p>
    </div>
  );
}
