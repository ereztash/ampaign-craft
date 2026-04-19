import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadExport, ENGINE_MANIFEST } from "../exportEngine";
import type { ExportResult } from "../exportEngine";

// ═══════════════════════════════════════════════
// DOM stubs
// ═══════════════════════════════════════════════

function makeExportResult(overrides: Partial<ExportResult> = {}): ExportResult {
  return {
    data: new TextEncoder().encode("hello world").buffer,
    filename: "report.csv",
    mimeType: "text/csv",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════
// ENGINE_MANIFEST
// ═══════════════════════════════════════════════

describe("exportEngine — ENGINE_MANIFEST", () => {
  it("has correct name", () => {
    expect(ENGINE_MANIFEST.name).toBe("exportEngine");
  });

  it("stage is deploy", () => {
    expect(ENGINE_MANIFEST.stage).toBe("deploy");
  });

  it("isLive is true", () => {
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });

  it("writes array is empty (no blackboard writes)", () => {
    expect(ENGINE_MANIFEST.writes).toHaveLength(0);
  });

  it("reads contains expected keys", () => {
    expect(ENGINE_MANIFEST.reads).toContain("CAMPAIGN-plans-*");
    expect(ENGINE_MANIFEST.reads).toContain("CAMPAIGN-analytics-*");
  });
});

// ═══════════════════════════════════════════════
// downloadExport — DOM interactions
// ═══════════════════════════════════════════════

describe("exportEngine — downloadExport", () => {
  let appendSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let createdAnchor: HTMLAnchorElement;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // jsdom does not implement URL.createObjectURL / revokeObjectURL — stub them
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, "createObjectURL", { writable: true, configurable: true, value: () => "" });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", { writable: true, configurable: true, value: () => {} });
    }

    clickSpy = vi.fn();
    createdAnchor = { href: "", download: "", click: clickSpy } as unknown as HTMLAnchorElement;

    vi.spyOn(document, "createElement").mockReturnValue(createdAnchor);
    appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => createdAnchor);
    removeSpy = vi.spyOn(document.body, "removeChild").mockImplementation(() => createdAnchor);
    createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-url");
    revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls URL.createObjectURL with a Blob", () => {
    downloadExport(makeExportResult());
    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    const arg = createObjectURLSpy.mock.calls[0][0];
    expect(arg).toBeInstanceOf(Blob);
  });

  it("sets anchor href to the created object URL", () => {
    downloadExport(makeExportResult());
    expect(createdAnchor.href).toBe("blob:test-url");
  });

  it("sets anchor download to the filename", () => {
    downloadExport(makeExportResult({ filename: "my-export.xlsx" }));
    expect(createdAnchor.download).toBe("my-export.xlsx");
  });

  it("appends anchor to document body", () => {
    downloadExport(makeExportResult());
    expect(appendSpy).toHaveBeenCalledWith(createdAnchor);
  });

  it("clicks the anchor element", () => {
    downloadExport(makeExportResult());
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it("removes anchor from document body after click", () => {
    downloadExport(makeExportResult());
    expect(removeSpy).toHaveBeenCalledWith(createdAnchor);
  });

  it("revokes the object URL after download", () => {
    downloadExport(makeExportResult());
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:test-url");
  });

  it("creates Blob with correct mimeType", () => {
    downloadExport(makeExportResult({ mimeType: "application/json" }));
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("application/json");
  });

  it("handles different file types — PDF", () => {
    downloadExport(makeExportResult({ filename: "report.pdf", mimeType: "application/pdf" }));
    expect(createdAnchor.download).toBe("report.pdf");
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("application/pdf");
  });

  it("handles empty ArrayBuffer without throwing", () => {
    expect(() =>
      downloadExport(makeExportResult({ data: new ArrayBuffer(0) })),
    ).not.toThrow();
  });

  it("handles large data buffer", () => {
    const largeBuffer = new ArrayBuffer(1024 * 1024); // 1MB
    expect(() =>
      downloadExport(makeExportResult({ data: largeBuffer })),
    ).not.toThrow();
  });

  it("operations happen in correct order: append → click → remove → revoke", () => {
    const order: string[] = [];
    appendSpy.mockImplementation(() => { order.push("append"); return createdAnchor; });
    clickSpy.mockImplementation(() => order.push("click"));
    removeSpy.mockImplementation(() => { order.push("remove"); return createdAnchor; });
    revokeObjectURLSpy.mockImplementation(() => order.push("revoke"));

    downloadExport(makeExportResult());
    expect(order).toEqual(["append", "click", "remove", "revoke"]);
  });
});
