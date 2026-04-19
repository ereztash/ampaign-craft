import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ComingSoon from "../ComingSoon";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

describe("ComingSoon", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <ComingSoon />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows main content area", () => {
    render(
      <MemoryRouter>
        <ComingSoon />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the coming soon heading with default feature name", () => {
    render(
      <MemoryRouter>
        <ComingSoon />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText(/coming soon/i)[0]).toBeInTheDocument();
  });

  it("renders the go back button", () => {
    render(
      <MemoryRouter>
        <ComingSoon />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /go back/i })).toBeInTheDocument();
  });

  it("accepts custom featureName prop", () => {
    render(
      <MemoryRouter>
        <ComingSoon featureName={{ he: "תכונה מיוחדת", en: "Special Feature" }} />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/special feature/i)[0]).toBeInTheDocument();
  });

  it("accepts custom eta prop", () => {
    render(
      <MemoryRouter>
        <ComingSoon eta={{ he: "בקרוב מאוד", en: "very soon" }} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/very soon/i)).toBeInTheDocument();
  });
});
