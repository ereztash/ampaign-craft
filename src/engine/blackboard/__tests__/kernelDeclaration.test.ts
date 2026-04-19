import { describe, it, expect } from "vitest";
import {
  KERNEL_ENGINES,
  KERNEL_INPUT_PREFIX,
  KERNEL_OUTPUT_PREFIX,
  SYSTEM_NAMESPACE_PREFIX,
  isKernelEngine,
} from "../kernelDeclaration";

describe("kernelDeclaration", () => {
  it("KERNEL_ENGINES contains the three core engines", () => {
    expect(KERNEL_ENGINES).toContain("userKnowledgeGraph");
    expect(KERNEL_ENGINES).toContain("discProfileEngine");
    expect(KERNEL_ENGINES).toContain("funnelEngine");
    expect(KERNEL_ENGINES).toHaveLength(3);
  });

  it("KERNEL_INPUT_PREFIX is 'USER-kernel-input-'", () => {
    expect(KERNEL_INPUT_PREFIX).toBe("USER-kernel-input-");
  });

  it("KERNEL_OUTPUT_PREFIX is 'USER-kernel-output-'", () => {
    expect(KERNEL_OUTPUT_PREFIX).toBe("USER-kernel-output-");
  });

  it("SYSTEM_NAMESPACE_PREFIX is 'SYSTEM-'", () => {
    expect(SYSTEM_NAMESPACE_PREFIX).toBe("SYSTEM-");
  });

  describe("isKernelEngine()", () => {
    it("returns true for each kernel engine name", () => {
      expect(isKernelEngine("userKnowledgeGraph")).toBe(true);
      expect(isKernelEngine("discProfileEngine")).toBe(true);
      expect(isKernelEngine("funnelEngine")).toBe(true);
    });

    it("returns false for non-kernel engine names", () => {
      expect(isKernelEngine("hormoziValueEngine")).toBe(false);
      expect(isKernelEngine("")).toBe(false);
      expect(isKernelEngine("SYSTEM-agent")).toBe(false);
    });
  });
});
