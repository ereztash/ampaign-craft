// ═══════════════════════════════════════════════
// Registry Test — Asserts that every src/engine/*.ts
// file is represented in REGISTRY. Catches the case
// where a new engine is added without registry coverage.
// ═══════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { REGISTRY, ALL_ENGINE_FILES, listLiveEngines } from "../blackboard/registry";

const ENGINE_DIR = path.resolve(__dirname, "..");

function listEngineFilesOnDisk(): string[] {
  return fs
    .readdirSync(ENGINE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .filter((entry) => !entry.name.endsWith(".test.ts"))
    .map((entry) => entry.name.replace(/\.ts$/, ""))
    .sort();
}

describe("engine registry", () => {
  it("REGISTRY contains an entry for every src/engine/*.ts file", () => {
    const onDisk = listEngineFilesOnDisk();
    const missing = onDisk.filter((name) => !(name in REGISTRY));
    expect(missing).toEqual([]);
  });

  it("ALL_ENGINE_FILES matches files on disk", () => {
    const onDisk = listEngineFilesOnDisk();
    expect([...ALL_ENGINE_FILES].sort()).toEqual(onDisk);
  });

  it("every REGISTRY entry has a non-empty name", () => {
    for (const [key, manifest] of Object.entries(REGISTRY)) {
      expect(manifest.name).toBeTruthy();
      // Stub manifests use their file name directly; live ones may differ.
      if (!manifest.isLive) {
        expect(manifest.name).toBe(key);
      }
    }
  });

  it("live engines expose at least one parameter", () => {
    const live = listLiveEngines();
    expect(live.length).toBeGreaterThan(0);
    for (const manifest of live) {
      expect(manifest.parameters.length).toBeGreaterThan(0);
    }
  });
});
