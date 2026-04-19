import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProgressMomentum } from "../ProgressMomentum";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const modules = [
  { id: "m1", label: { he: "שיווק", en: "Marketing" }, completed: true, route: "/marketing" },
  { id: "m2", label: { he: "מכירות", en: "Sales" }, completed: false, route: "/sales" },
];

describe("ProgressMomentum", () => {
  it("renders without crashing", () => {
    expect(() =>
      render(
        <MemoryRouter>
          <ProgressMomentum
            modules={modules}
            streakWeeks={2}
            investmentMinutes={120}
            plansCreated={3}
          />
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });

  it("shows Progress heading", () => {
    render(
      <MemoryRouter>
        <ProgressMomentum modules={modules} streakWeeks={2} investmentMinutes={120} plansCreated={3} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Progress")).toBeInTheDocument();
  });

  it("shows completed/total module count", () => {
    render(
      <MemoryRouter>
        <ProgressMomentum modules={modules} streakWeeks={2} investmentMinutes={120} plansCreated={3} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/1\/2/)).toBeInTheDocument();
  });

  it("shows streak weeks when greater than 0", () => {
    render(
      <MemoryRouter>
        <ProgressMomentum modules={modules} streakWeeks={2} investmentMinutes={120} plansCreated={3} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/2.*week streak/i)).toBeInTheDocument();
  });

  it("shows plans created count", () => {
    render(
      <MemoryRouter>
        <ProgressMomentum modules={modules} streakWeeks={2} investmentMinutes={120} plansCreated={3} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/3.*strategies/i)).toBeInTheDocument();
  });

  it("shows next incomplete module as continue button", () => {
    render(
      <MemoryRouter>
        <ProgressMomentum modules={modules} streakWeeks={0} investmentMinutes={60} plansCreated={1} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Continue: Sales/i)).toBeInTheDocument();
  });

  it("does not show streak when streakWeeks is 0", () => {
    render(
      <MemoryRouter>
        <ProgressMomentum modules={modules} streakWeeks={0} investmentMinutes={60} plansCreated={0} />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/week streak/i)).toBeNull();
  });
});
