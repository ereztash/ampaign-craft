import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Terms from "../Terms";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/components/BackToHub", () => ({
  default: () => <div data-testid="back-to-hub" />,
}));

describe("Terms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows main content area", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("shows the Terms of Service heading", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
  });

  it("shows the last updated date", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-04-17/)).toBeInTheDocument();
  });

  it("shows Permitted use section", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );
    expect(screen.getByText(/permitted use/i)).toBeInTheDocument();
  });

  it("shows Prohibited use section", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );
    expect(screen.getByText(/prohibited use/i)).toBeInTheDocument();
  });

  it("shows Liability section", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );
    expect(screen.getByText(/liability/i)).toBeInTheDocument();
  });

  it("shows Termination & cancellation section", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );
    expect(screen.getByText(/termination & cancellation/i)).toBeInTheDocument();
  });

  it("shows Governing law section", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );
    expect(screen.getByText(/governing law/i)).toBeInTheDocument();
  });

  it("shows the beta disclaimer text", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );
    expect(screen.getByText(/as-is/i)).toBeInTheDocument();
  });
});
