import { describe, it, expect, vi } from "vitest";

vi.mock("../../discProfileEngine",        () => ({ ENGINE_MANIFEST: { name: "discProfileEngine", reads: ["formData"], writes: ["discProfile"], stage: "diagnose", isLive: true, parameters: [] } }));
vi.mock("../../funnelEngine",             () => ({ ENGINE_MANIFEST: { name: "funnelEngine", reads: [], writes: [], stage: "diagnose", isLive: true, parameters: [] } }));
vi.mock("../../userKnowledgeGraph",       () => ({ ENGINE_MANIFEST: { name: "userKnowledgeGraph", reads: [], writes: [], stage: "discover", isLive: true, parameters: [] } }));
vi.mock("../../predictiveEngine",         () => ({ ENGINE_MANIFEST: { name: "predictiveEngine", reads: [], writes: [], stage: "unknown", isLive: false, parameters: [] } }));
vi.mock("../../abTestEngine",             () => ({ ENGINE_MANIFEST: { name: "abTestEngine", reads: [], writes: [], stage: "unknown", isLive: false, parameters: [] } }));
vi.mock("../../behavioralActionEngine",   () => ({ ENGINE_MANIFEST: { name: "behavioralActionEngine", reads: [], writes: [], stage: "unknown", isLive: false, parameters: [] } }));
vi.mock("../../brandVectorEngine",        () => ({ ENGINE_MANIFEST: { name: "brandVectorEngine", reads: [], writes: [], stage: "unknown", isLive: false, parameters: [] } }));
vi.mock("../../businessFingerprintEngine",() => ({ ENGINE_MANIFEST: { name: "businessFingerprintEngine", reads: [], writes: [], stage: "unknown", isLive: false, parameters: [] } }));
vi.mock("../../stylomeEngine",            () => ({ ENGINE_MANIFEST: { name: "stylomeEngine", reads: [], writes: [], stage: "unknown", isLive: false, parameters: [] } }));
vi.mock("../../exportEngine",             () => ({ ENGINE_MANIFEST: { name: "exportEngine", reads: [], writes: [], stage: "unknown", isLive: false, parameters: [] } }));

import { REGISTRY, ALL_ENGINE_FILES, getManifest, listLiveEngines } from "../registry";

describe("registry", () => {
  describe("ALL_ENGINE_FILES", () => {
    it("contains at least 50 engine file names", () => {
      expect(ALL_ENGINE_FILES.length).toBeGreaterThanOrEqual(50);
    });

    it("includes key engines", () => {
      expect(ALL_ENGINE_FILES).toContain("discProfileEngine");
      expect(ALL_ENGINE_FILES).toContain("funnelEngine");
      expect(ALL_ENGINE_FILES).toContain("userKnowledgeGraph");
      expect(ALL_ENGINE_FILES).toContain("hormoziValueEngine");
    });

    it("has no duplicate entries", () => {
      const unique = new Set(ALL_ENGINE_FILES);
      expect(unique.size).toBe(ALL_ENGINE_FILES.length);
    });
  });

  describe("REGISTRY", () => {
    it("has an entry for every engine file", () => {
      for (const name of ALL_ENGINE_FILES) {
        expect(REGISTRY[name], `missing registry entry for ${name}`).toBeDefined();
      }
    });

    it("live manifests have isLive=true", () => {
      expect(REGISTRY["discProfileEngine"].isLive).toBe(true);
      expect(REGISTRY["funnelEngine"].isLive).toBe(true);
      expect(REGISTRY["userKnowledgeGraph"].isLive).toBe(true);
    });

    it("stub entries have isLive=false and stage='unknown'", () => {
      expect(REGISTRY["hormoziValueEngine"].isLive).toBe(false);
      expect(REGISTRY["hormoziValueEngine"].stage).toBe("unknown");
    });
  });

  describe("getManifest()", () => {
    it("returns the manifest for a known engine", () => {
      const m = getManifest("discProfileEngine");
      expect(m).toBeDefined();
      expect(m?.name).toBe("discProfileEngine");
    });

    it("returns undefined for unknown engine", () => {
      expect(getManifest("nonExistentEngine")).toBeUndefined();
    });
  });

  describe("listLiveEngines()", () => {
    it("returns only manifests where isLive=true", () => {
      const live = listLiveEngines();
      expect(live.every((m) => m.isLive)).toBe(true);
    });

    it("includes the three mocked live engines", () => {
      const names = listLiveEngines().map((m) => m.name);
      expect(names).toContain("discProfileEngine");
      expect(names).toContain("funnelEngine");
      expect(names).toContain("userKnowledgeGraph");
    });
  });
});
