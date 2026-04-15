// ═══════════════════════════════════════════════
// Export Engine — File download helpers
// ═══════════════════════════════════════════════

export const ENGINE_MANIFEST = {
  name: "exportEngine",
  reads: ["CAMPAIGN-plans-*", "CAMPAIGN-analytics-*"],
  writes: [],
  stage: "deploy" as const,
  isLive: true,
  parameters: ["Export to channels"],
} as const;

export interface ExportResult {
  data: ArrayBuffer;
  filename: string;
  mimeType: string;
}

/**
 * Trigger file download in the browser.
 */
export function downloadExport(result: ExportResult): void {
  const blob = new Blob([result.data], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
