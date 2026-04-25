import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  projectEmbedding,
  cosineSimilarity,
  computePlanCentroid,
  clearProjectionCache,
  loadActiveProjection,
  type SSLProjection,
} from "../sslEmbeddingEngine";

// ═══════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════

const store = new Map<string, unknown>();

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(<T>(key: string, fallback: T): T =>
      store.has(key) ? (store.get(key) as T) : fallback,
    ),
    setJSON: vi.fn((key: string, value: unknown) => { store.set(key, value); }),
    remove:  vi.fn((key: string) => { store.delete(key); }),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq:        () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        is:        () => Promise.resolve({ data: [], error: null }),
        in:        () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}));

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  clearProjectionCache();
});

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function identityProjection(dim: number): SSLProjection {
  // W = I (padded): maps first dim values straight through, output=dim
  const matrix = new Float32Array(dim * dim);
  for (let i = 0; i < dim; i++) matrix[i * dim + i] = 1;
  return { version: 1, dimIn: dim, dimOut: dim, matrix, evalLoss: 0, loadedAt: Date.now() };
}

function uniformProjection(dimIn: number, dimOut: number, val: number): SSLProjection {
  const matrix = new Float32Array(dimOut * dimIn).fill(val);
  return { version: 1, dimIn, dimOut, matrix, evalLoss: 0, loadedAt: Date.now() };
}

// ═══════════════════════════════════════════════
// projectEmbedding
// ═══════════════════════════════════════════════

describe("projectEmbedding", () => {
  it("returns a Float32Array of length dimOut", () => {
    const proj = identityProjection(4);
    const result = projectEmbedding([1, 0, 0, 0], proj);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(4);
  });

  it("preserves direction with identity matrix", () => {
    const proj = identityProjection(4);
    const result = projectEmbedding([3, 4, 0, 0], proj);
    // L2 norm of [3,4,0,0] = 5 → output should be [0.6, 0.8, 0, 0]
    expect(result[0]).toBeCloseTo(0.6, 5);
    expect(result[1]).toBeCloseTo(0.8, 5);
  });

  it("L2-normalizes output to unit length", () => {
    const proj = identityProjection(4);
    const result = projectEmbedding([1, 2, 3, 4], proj);
    let norm = 0;
    for (let i = 0; i < result.length; i++) norm += result[i] ** 2;
    expect(Math.sqrt(norm)).toBeCloseTo(1, 5);
  });

  it("truncates input longer than dimIn", () => {
    const proj = identityProjection(2);
    const result = projectEmbedding([1, 0, 999, 999], proj);
    expect(result.length).toBe(2);
  });

  it("pads input shorter than dimIn with zeros", () => {
    const proj = identityProjection(4);
    const result = projectEmbedding([1], proj);
    // Only first component is non-zero
    expect(result.length).toBe(4);
    const maxIdx = Array.from(result).indexOf(Math.max(...result));
    expect(maxIdx).toBe(0);
  });
});

// ═══════════════════════════════════════════════
// cosineSimilarity
// ═══════════════════════════════════════════════

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = new Float32Array([0.6, 0.8]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("returns -1 for opposite vectors", () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([-1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([0, 1]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it("clamps output to [-1, 1]", () => {
    const a = new Float32Array([2, 0]);
    const b = new Float32Array([2, 0]);
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeLessThanOrEqual(1);
    expect(sim).toBeGreaterThanOrEqual(-1);
  });
});

// ═══════════════════════════════════════════════
// computePlanCentroid
// ═══════════════════════════════════════════════

describe("computePlanCentroid", () => {
  it("returns null for empty embeddings", () => {
    const proj = identityProjection(4);
    expect(computePlanCentroid([], proj)).toBeNull();
  });

  it("returns a Float32Array of length dimOut", () => {
    const proj = identityProjection(4);
    const centroid = computePlanCentroid([[1, 0, 0, 0], [0, 1, 0, 0]], proj);
    expect(centroid).toBeInstanceOf(Float32Array);
    expect(centroid!.length).toBe(4);
  });

  it("centroid is L2-normalized", () => {
    const proj = identityProjection(4);
    const centroid = computePlanCentroid([[1, 0, 0, 0], [0, 0, 1, 0]], proj);
    let norm = 0;
    for (let i = 0; i < centroid!.length; i++) norm += centroid![i] ** 2;
    expect(Math.sqrt(norm)).toBeCloseTo(1, 4);
  });

  it("similar embeddings produce higher centroid similarity than dissimilar ones", () => {
    const proj = identityProjection(4);

    // Cluster A: first two dims dominant
    const ca = computePlanCentroid([[1, 1, 0, 0], [1, 0.9, 0, 0]], proj)!;
    // Cluster B: last two dims dominant
    const cb = computePlanCentroid([[0, 0, 1, 1], [0, 0, 0.9, 1]], proj)!;
    // Control: same cluster as A
    const cc = computePlanCentroid([[0.9, 1, 0, 0]], proj)!;

    const simAC = cosineSimilarity(ca, cc); // should be high
    const simAB = cosineSimilarity(ca, cb); // should be low

    expect(simAC).toBeGreaterThan(simAB);
  });
});

// ═══════════════════════════════════════════════
// loadActiveProjection
// ═══════════════════════════════════════════════

describe("loadActiveProjection", () => {
  it("returns null when Supabase has no active projection", async () => {
    const result = await loadActiveProjection();
    expect(result).toBeNull();
  });

  it("returns cached projection without re-fetching Supabase", async () => {
    // Prime the localStorage cache
    const entry = {
      version: 2, dimIn: 4, dimOut: 2,
      matrixB64: btoa(String.fromCharCode(...new Uint8Array(new Float32Array([1,0,0,0, 0,1,0,0]).buffer))),
      evalLoss: 0.5,
      cachedAt: new Date().toISOString(),
    };
    store.set("funnelforge-ssl-projection", entry);

    const { supabase } = await import("@/integrations/supabase/client");
    const fromSpy = vi.spyOn(supabase as unknown as { from: () => unknown }, "from");

    const proj = await loadActiveProjection();
    expect(proj).not.toBeNull();
    expect(proj!.version).toBe(2);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("projection matrix has correct dimensions", async () => {
    const dimIn = 4;
    const dimOut = 2;
    const matrixF32 = new Float32Array(dimOut * dimIn);
    for (let i = 0; i < matrixF32.length; i++) matrixF32[i] = i * 0.1;
    const bytes = new Uint8Array(matrixF32.buffer);
    let b64 = "";
    for (let i = 0; i < bytes.length; i++) b64 += String.fromCharCode(bytes[i]);

    store.set("funnelforge-ssl-projection", {
      version: 1, dimIn, dimOut,
      matrixB64: btoa(b64),
      evalLoss: 0.3,
      cachedAt: new Date().toISOString(),
    });

    const proj = await loadActiveProjection();
    expect(proj!.matrix.length).toBe(dimOut * dimIn);
    expect(proj!.dimIn).toBe(dimIn);
    expect(proj!.dimOut).toBe(dimOut);
  });
});

// ═══════════════════════════════════════════════
// clearProjectionCache
// ═══════════════════════════════════════════════

describe("clearProjectionCache", () => {
  it("removes localStorage entry", async () => {
    store.set("funnelforge-ssl-projection", { version: 1, dimIn: 4, dimOut: 2, matrixB64: "", evalLoss: 0, cachedAt: new Date().toISOString() });
    clearProjectionCache();
    expect(store.has("funnelforge-ssl-projection")).toBe(false);
  });

  it("forces Supabase fetch on next loadActiveProjection call", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    clearProjectionCache();
    const fromSpy = vi.spyOn(supabase as unknown as { from: () => unknown }, "from");
    await loadActiveProjection();
    expect(fromSpy).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════
// Contrastive property: same-plan > cross-plan similarity
// ═══════════════════════════════════════════════

describe("contrastive projection property", () => {
  it("items from the same cluster are more similar after projection than cross-cluster items", () => {
    // 4-dim embeddings: first 2 dims = cluster A, last 2 dims = cluster B
    // Projection: W that emphasizes within-cluster agreement
    const dimIn = 4;
    const dimOut = 2;
    // W row 0: [1, 1, 0, 0] — captures cluster A
    // W row 1: [0, 0, 1, 1] — captures cluster B
    const matrix = new Float32Array([1, 1, 0, 0,  0, 0, 1, 1]);
    const proj: SSLProjection = { version: 1, dimIn, dimOut, matrix, evalLoss: 0, loadedAt: Date.now() };

    const itemA1 = projectEmbedding([1, 0.9, 0.1, 0], proj);
    const itemA2 = projectEmbedding([0.9, 1, 0, 0.1], proj);
    const itemB1 = projectEmbedding([0.1, 0, 1, 0.9], proj);

    const samePlanSim   = cosineSimilarity(itemA1, itemA2); // should be high
    const crossPlanSim  = cosineSimilarity(itemA1, itemB1); // should be low

    expect(samePlanSim).toBeGreaterThan(crossPlanSim);
  });
});
