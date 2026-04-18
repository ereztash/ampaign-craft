import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DidThisHelp } from "../DidThisHelp";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

const insertMock = vi.fn(() => Promise.resolve({ data: null, error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({ insert: insertMock })),
    auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: null } })) },
  },
}));

vi.mock("@/lib/safeStorage", () => ({
  safeSessionStorage: {
    getJSON: vi.fn(() => null),
    setJSON: vi.fn(),
  },
}));

describe("DidThisHelp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    const { container } = render(<DidThisHelp module="test-module" />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the 'Did this help?' prompt in idle state", () => {
    render(<DidThisHelp module="test-module" />);
    expect(screen.getByText("Did this help?")).toBeTruthy();
  });

  it("shows Yes and No buttons", () => {
    render(<DidThisHelp module="test-module" />);
    expect(screen.getByRole("button", { name: /yes/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /no/i })).toBeTruthy();
  });

  it("transitions to thanks state on Yes click", async () => {
    render(<DidThisHelp module="test-module" />);
    fireEvent.click(screen.getByRole("button", { name: /yes/i }));
    await waitFor(() => {
      expect(screen.getByText(/thanks for your feedback/i)).toBeTruthy();
    });
  });

  it("transitions to thanks state on No click", async () => {
    render(<DidThisHelp module="test-module" />);
    fireEvent.click(screen.getByRole("button", { name: /no/i }));
    await waitFor(() => {
      expect(screen.getByText(/thanks for your feedback/i)).toBeTruthy();
    });
  });

  it("calls supabase insert after voting", async () => {
    render(<DidThisHelp module="test-module" />);
    fireEvent.click(screen.getByRole("button", { name: /yes/i }));
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledOnce();
    });
  });

  it("accepts a custom className", () => {
    const { container } = render(<DidThisHelp module="test-module" className="my-custom" />);
    expect(container.querySelector(".my-custom")).toBeTruthy();
  });
});
