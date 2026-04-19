import { describe, it, expect, vi, beforeEach } from "vitest";

const mockClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }),
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockClient),
}));

describe("supabase client", () => {
  it("exports a supabase client object", async () => {
    const { supabase } = await import("../client");
    expect(supabase).toBeDefined();
  });

  it("client has auth property", async () => {
    const { supabase } = await import("../client");
    expect(supabase.auth).toBeDefined();
  });

  it("client has from() method", async () => {
    const { supabase } = await import("../client");
    expect(typeof supabase.from).toBe("function");
  });

  it("createClient was called once during module init", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    expect(createClient).toHaveBeenCalledOnce();
  });

  it("createClient received persistSession: true in auth config", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const callArgs = (createClient as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[2]?.auth?.persistSession).toBe(true);
  });

  it("createClient received autoRefreshToken: true in auth config", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const callArgs = (createClient as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[2]?.auth?.autoRefreshToken).toBe(true);
  });
});
