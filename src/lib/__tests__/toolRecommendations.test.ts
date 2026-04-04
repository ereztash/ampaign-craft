import { describe, it, expect } from "vitest";
import { getToolsForChannel, getIsraeliToolsSummary } from "../toolRecommendations";

describe("getToolsForChannel", () => {
  it("returns ActiveTrail for email channel", () => {
    const tools = getToolsForChannel("email");
    const names = tools.map((t) => t.tool);
    expect(names).toContain("ActiveTrail");
  });

  it("returns tools for content channel", () => {
    const tools = getToolsForChannel("content");
    expect(tools.length).toBeGreaterThan(0);
  });

  it("returns empty for unknown channel", () => {
    const tools = getToolsForChannel("nonexistent");
    expect(tools).toHaveLength(0);
  });

  it("all returned tools are Israeli-made", () => {
    const channels = ["email", "content", "whatsapp", "facebook", "instagram", "google", "other"];
    for (const ch of channels) {
      const tools = getToolsForChannel(ch);
      for (const tool of tools) {
        expect(tool.israeliMade).toBe(true);
      }
    }
  });

  it("each tool has bilingual description", () => {
    const tools = getToolsForChannel("email");
    for (const tool of tools) {
      expect(tool.description.he).toBeTruthy();
      expect(tool.description.en).toBeTruthy();
      expect(tool.why.he).toBeTruthy();
      expect(tool.why.en).toBeTruthy();
    }
  });
});

describe("getIsraeliToolsSummary", () => {
  it("returns exactly 5 tools", () => {
    const tools = getIsraeliToolsSummary();
    expect(tools).toHaveLength(5);
  });

  it("includes ActiveTrail, Monday.com, Wix, Elementor, Outbrain", () => {
    const tools = getIsraeliToolsSummary();
    const names = tools.map((t) => t.tool);
    expect(names).toContain("ActiveTrail");
    expect(names).toContain("Monday.com");
    expect(names).toContain("Wix");
    expect(names).toContain("Elementor");
    expect(names).toContain("Outbrain");
  });

  it("each tool has bilingual role", () => {
    const tools = getIsraeliToolsSummary();
    for (const tool of tools) {
      expect(tool.role.he).toBeTruthy();
      expect(tool.role.en).toBeTruthy();
    }
  });
});
