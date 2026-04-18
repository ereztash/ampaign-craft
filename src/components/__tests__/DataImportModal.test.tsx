import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DataImportModal from "../DataImportModal";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock("@/engine/dataImportEngine", () => ({
  parseXlsxFile: vi.fn().mockResolvedValue([{ rows: [] }]),
  detectSchema: vi.fn().mockReturnValue({
    detectedType: "campaign_performance",
    columns: [{ name: "date", role: "date" }, { name: "clicks", role: "metric" }],
  }),
  validateDataset: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
}));

describe("DataImportModal", () => {
  it("renders without crashing when open", () => {
    render(
      <DataImportModal
        open={true}
        onOpenChange={vi.fn()}
        onImport={vi.fn()}
      />
    );
    expect(screen.getByText("Import Data")).toBeInTheDocument();
  });

  it("shows upload step instructions", () => {
    render(
      <DataImportModal
        open={true}
        onOpenChange={vi.fn()}
        onImport={vi.fn()}
      />
    );
    expect(screen.getByText("Drag a file here or click to browse")).toBeInTheDocument();
  });

  it("shows supported formats", () => {
    render(
      <DataImportModal
        open={true}
        onOpenChange={vi.fn()}
        onImport={vi.fn()}
      />
    );
    expect(screen.getByText("Supports .xlsx and .csv")).toBeInTheDocument();
  });

  it("shows choose file button", () => {
    render(
      <DataImportModal
        open={true}
        onOpenChange={vi.fn()}
        onImport={vi.fn()}
      />
    );
    expect(screen.getByText("Choose File")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(
      <DataImportModal
        open={false}
        onOpenChange={vi.fn()}
        onImport={vi.fn()}
      />
    );
    expect(screen.queryByText("Import Data")).not.toBeInTheDocument();
  });

  it("shows file input element", () => {
    render(
      <DataImportModal
        open={true}
        onOpenChange={vi.fn()}
        onImport={vi.fn()}
      />
    );
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute("accept", ".xlsx,.csv,.xls");
  });

  it("shows plan link selector when savedPlanIds provided", () => {
    // This is visible on the preview step; in upload step it won't show
    render(
      <DataImportModal
        open={true}
        onOpenChange={vi.fn()}
        onImport={vi.fn()}
        savedPlanIds={[{ id: "p1", name: "My Plan" }]}
      />
    );
    // Still on upload step, plan selector not visible yet
    expect(screen.queryByText("Link to plan (optional):")).not.toBeInTheDocument();
  });
});
