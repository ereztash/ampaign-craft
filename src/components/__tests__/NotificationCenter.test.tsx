import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationCenter } from "../NotificationCenter";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));

vi.mock("@/lib/notificationQueue", () => ({
  notificationQueue: {
    getAll: vi.fn(() => []),
    markAllRead: vi.fn(),
    clear: vi.fn(),
  },
}));

describe("NotificationCenter", () => {
  it("renders without crashing", () => {
    expect(() => render(<NotificationCenter />)).not.toThrow();
  });

  it("shows the bell button", () => {
    render(<NotificationCenter />);
    const btn = screen.getByRole("button", { name: /notifications/i });
    expect(btn).toBeInTheDocument();
  });

  it("does not show a badge when there are no unread notifications", () => {
    render(<NotificationCenter />);
    // no badge number should appear
    expect(screen.queryByText("9+")).toBeNull();
  });

  it("shows unread badge count when there are unread notifications", async () => {
    const { notificationQueue } = await import("@/lib/notificationQueue");
    vi.mocked(notificationQueue.getAll).mockReturnValue([
      {
        id: "n1",
        type: "system",
        title: { he: "כותרת", en: "Title" },
        body: { he: "גוף", en: "Body" },
        read: false,
        createdAt: new Date().toISOString(),
      },
    ] as any);

    render(<NotificationCenter />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows the aria-label for notifications button", () => {
    render(<NotificationCenter />);
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
  });
});
