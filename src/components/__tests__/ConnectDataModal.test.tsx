import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ConnectDataModal from "../ConnectDataModal";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

describe("ConnectDataModal", () => {
  it("renders without crashing when open", () => {
    render(
      <MemoryRouter>
        <ConnectDataModal open={true} onOpenChange={vi.fn()} onOpenImport={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByText("Connect a data source")).toBeInTheDocument();
  });

  it("shows all connection options when no initialPlatform", () => {
    render(
      <MemoryRouter>
        <ConnectDataModal open={true} onOpenChange={vi.fn()} onOpenImport={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByText("CSV / Excel import")).toBeInTheDocument();
    expect(screen.getByText("Business profile (wizard)")).toBeInTheDocument();
    expect(screen.getByText("Meta Ads (OAuth)")).toBeInTheDocument();
  });

  it("shows only CSV import for manual_import platform", () => {
    render(
      <MemoryRouter>
        <ConnectDataModal
          open={true}
          onOpenChange={vi.fn()}
          onOpenImport={vi.fn()}
          initialPlatform="manual_import"
        />
      </MemoryRouter>
    );
    expect(screen.getByText("CSV / Excel import")).toBeInTheDocument();
    expect(screen.queryByText("Business profile (wizard)")).not.toBeInTheDocument();
  });

  it("shows only meta option for meta platform", () => {
    render(
      <MemoryRouter>
        <ConnectDataModal
          open={true}
          onOpenChange={vi.fn()}
          onOpenImport={vi.fn()}
          initialPlatform="meta"
        />
      </MemoryRouter>
    );
    expect(screen.getByText("Meta Ads (OAuth)")).toBeInTheDocument();
    expect(screen.queryByText("CSV / Excel import")).not.toBeInTheDocument();
  });

  it("calls onOpenImport when CSV button clicked", () => {
    const onOpenImport = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <MemoryRouter>
        <ConnectDataModal
          open={true}
          onOpenChange={onOpenChange}
          onOpenImport={onOpenImport}
        />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("CSV / Excel import"));
    expect(onOpenImport).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("navigates to /wizard when business profile clicked", () => {
    render(
      <MemoryRouter>
        <ConnectDataModal open={true} onOpenChange={vi.fn()} onOpenImport={vi.fn()} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("Business profile (wizard)"));
    expect(mockNavigate).toHaveBeenCalledWith("/wizard");
  });

  it("does not render content when closed", () => {
    render(
      <MemoryRouter>
        <ConnectDataModal open={false} onOpenChange={vi.fn()} onOpenImport={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.queryByText("Connect a data source")).not.toBeInTheDocument();
  });
});
