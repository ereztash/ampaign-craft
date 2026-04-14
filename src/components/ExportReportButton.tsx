// ExportReportButton — PDF report from a FunnelForge plan
// Uses jsPDF (already in package.json). No external service needed.

import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { tx } from "@/i18n/tx";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { FunnelResult } from "@/types/funnel";
import { calculateHealthScore } from "@/engine/healthScoreEngine";

interface ExportReportButtonProps {
  result: FunnelResult;
  planName?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
}

export function ExportReportButton({
  result,
  planName = "FunnelForge Report",
  size = "sm",
  variant = "outline",
}: ExportReportButtonProps) {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Dynamic import to keep bundle small
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const fd = result.formData;
      const healthScore = calculateHealthScore(result).total;
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 18;
      const usableW = pageW - margin * 2;
      let y = margin;

      const addLine = (text: string, opts?: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number }) => {
        const { size = 10, bold = false, color = [30, 30, 30], indent = 0 } = opts ?? {};
        doc.setFontSize(size);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(text, usableW - indent);
        doc.text(lines, margin + indent, y);
        y += (lines.length * (size * 0.4)) + 2;
      };

      const addSection = (title: string) => {
        y += 4;
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(margin - 2, y - 4, usableW + 4, 8, 1, 1, "F");
        addLine(title, { size: 11, bold: true, color: [59, 130, 246] });
        y += 2;
      };

      const addSeparator = () => {
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y, pageW - margin, y);
        y += 4;
      };

      const newPageIfNeeded = (needed = 20) => {
        if (y + needed > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
      };

      // ── Header ────────────────────────────────────────────────
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageW, 28, "F");
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("FunnelForge", margin, 12);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(planName, margin, 20);
      doc.text(new Date().toLocaleDateString("he-IL"), pageW - margin, 20, { align: "right" });
      y = 38;

      // ── Health score badge ────────────────────────────────────
      const scoreColor: [number, number, number] = healthScore >= 70 ? [16, 185, 129] : healthScore >= 40 ? [245, 158, 11] : [239, 68, 68];
      doc.setFillColor(...scoreColor);
      doc.roundedRect(pageW - margin - 24, 32, 24, 12, 2, 2, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`${healthScore}/100`, pageW - margin - 12, 40, { align: "center" });
      doc.setTextColor(30, 30, 30);

      // ── Business Details ──────────────────────────────────────
      addSection(tx({ he: "פרטי העסק", en: "Business Details" }, language));
      const details = [
        fd.businessField ? [tx({ he: "תחום", en: "Field" }, language), fd.businessField] : null,
        fd.productDescription ? [tx({ he: "מוצר/שירות", en: "Product" }, language), fd.productDescription] : null,
        fd.averagePrice ? [tx({ he: "מחיר ממוצע", en: "Avg Price" }, language), `₪${fd.averagePrice}`] : null,
        fd.audienceType ? [tx({ he: "קהל יעד", en: "Audience" }, language), fd.audienceType] : null,
        fd.salesModel ? [tx({ he: "מודל מכירות", en: "Sales Model" }, language), fd.salesModel] : null,
        fd.budgetRange ? [tx({ he: "תקציב", en: "Budget" }, language), fd.budgetRange] : null,
        fd.mainGoal ? [tx({ he: "מטרה", en: "Goal" }, language), fd.mainGoal] : null,
      ].filter(Boolean) as [string, string][];

      for (const [label, value] of details) {
        addLine(`${label}: ${value}`, { size: 9, indent: 2 });
      }
      addSeparator();

      // ── Executive Summary ─────────────────────────────────────
      const summary = (result as unknown as Record<string, unknown>).executiveSummary || ((result as unknown as Record<string, unknown>).funnelResult as Record<string, unknown>)?.executiveSummary;
      if (summary) {
        newPageIfNeeded(40);
        addSection(tx({ he: "תמצית אסטרטגית", en: "Executive Summary" }, language));
        addLine(String(summary), { size: 9, indent: 2 });
        addSeparator();
      }

      // ── Funnel Stages ─────────────────────────────────────────
      const stages = result.stages ?? [];
      if (stages.length > 0) {
        newPageIfNeeded(30);
        addSection(tx({ he: "שלבי המשפך", en: "Funnel Stages" }, language));
        for (const stage of stages) {
          newPageIfNeeded(15);
          const stageName = typeof stage.name === "object" ? (stage.name as Record<string, string>)[language] ?? stage.name : stage.name;
          addLine(`• ${stageName}`, { size: 9, bold: true, indent: 2 });
          if ((stage as unknown as Record<string, unknown>).strategy) {
            const strat = typeof (stage as unknown as Record<string, unknown>).strategy === "object" ? ((stage as unknown as Record<string, Record<string, string>>).strategy)[language] ?? "" : (stage as unknown as Record<string, string>).strategy;
            if (strat) addLine(strat, { size: 8, indent: 6, color: [80, 80, 80] });
          }
          y += 1;
        }
        addSeparator();
      }

      // ── Recommended Channels ──────────────────────────────────
      const channels = (result as unknown as Record<string, unknown[]>).recommendedChannels ?? [];
      if (channels.length > 0) {
        newPageIfNeeded(20);
        addSection(tx({ he: "ערוצים מומלצים", en: "Recommended Channels" }, language));
        channels.slice(0, 6).forEach((ch, i) => {
          const name = typeof ch === "string" ? ch : (ch as Record<string, unknown>).name?.[language as keyof object] ?? (ch as Record<string, unknown>).name ?? String(ch);
          addLine(`${i + 1}. ${name}`, { size: 9, indent: 2 });
        });
        addSeparator();
      }

      // ── KPIs ─────────────────────────────────────────────────
      const kpis = result.kpis ?? [];
      if (kpis.length > 0) {
        newPageIfNeeded(20);
        addSection("KPIs");
        kpis.slice(0, 6).forEach((kpi) => {
          const name = typeof kpi === "string" ? kpi : (kpi as Record<string, unknown>).name?.[language as keyof object] ?? String(kpi);
          const value = typeof kpi === "object" ? (kpi as Record<string, unknown>).target ?? "" : "";
          addLine(`• ${name}${value ? ": " + value : ""}`, { size: 9, indent: 2 });
        });
        addSeparator();
      }

      // ── Footer ────────────────────────────────────────────────
      const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const footerY = doc.internal.pageSize.getHeight() - 8;
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text("Generated by FunnelForge · funnelforge.app", margin, footerY);
        doc.text(`${i}/${totalPages}`, pageW - margin, footerY, { align: "right" });
      }

      const filename = `${planName.replace(/[^a-z0-9\u0590-\u05FF]/gi, "-").toLowerCase()}-report.pdf`;
      doc.save(filename);
      toast({ title: tx({ he: "הדוח יוצא בהצלחה", en: "Report exported successfully" }, language) });
    } catch (err) {
      console.error("PDF export error:", err);
      toast({
        title: tx({ he: "שגיאה בייצוא", en: "Export failed" }, language),
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleExport}
      disabled={loading}
      className="gap-1.5"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <FileDown className="h-3.5 w-3.5" />
      )}
      {tx({ he: "יצוא PDF", en: "Export PDF" }, language)}
    </Button>
  );
}
