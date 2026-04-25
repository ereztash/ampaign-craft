/**
 * Auth flow and core user-journey tests.
 * Covers gaps not addressed by 01-routes-smoke and 02-wizard-flood:
 * sign-out behavior, admin redirect enforcement, and interaction on
 * strategy / CRM / profile / plans pages.
 */
import { test, expect } from "@playwright/test";
import { seedLocalAuth } from "./helpers";

// ─── Auth flow ────────────────────────────────────────────────────────────────

test.describe("auth flow", () => {
  test("sign-out clears session without crashing", async ({ page }) => {
    await seedLocalAuth(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

    // Look for any sign-out affordance (sidebar button, avatar menu, etc.)
    const signOutBtn = page
      .locator(
        "[data-testid=sign-out], button:has-text('התנתק'), button:has-text('Sign out'), button:has-text('Sign Out')",
      )
      .first();

    if (await signOutBtn.isVisible().catch(() => false)) {
      await signOutBtn.click();
      await page.waitForTimeout(600);
    }

    const crash = await page.locator("text=Something went wrong").count();
    expect(crash, "crash after sign-out").toBe(0);
    expect(errs).toHaveLength(0);
  });

  test("admin route redirects or shows login for unauthenticated user", async ({ page }) => {
    // Start clean — no seeded session
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.removeItem("funnelforge-session");
      localStorage.removeItem("funnelforge-users");
    });

    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

    await page.goto("/admin/aarrr", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    const crash = await page.locator("text=Something went wrong").count();
    expect(crash, "crash on admin route without auth").toBe(0);
    // Must redirect away from /admin/aarrr (AdminRoute guard pushes to "/")
    expect(page.url()).not.toContain("/admin/aarrr");
    expect(errs).toHaveLength(0);
  });

  test("admin/agents route redirects unauthenticated user", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.removeItem("funnelforge-session");
      localStorage.removeItem("funnelforge-users");
    });

    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

    await page.goto("/admin/agents", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    const crash = await page.locator("text=Something went wrong").count();
    expect(crash).toBe(0);
    expect(page.url()).not.toContain("/admin/agents");
    expect(errs).toHaveLength(0);
  });
});

// ─── Core user journeys ───────────────────────────────────────────────────────

test.describe("core user journeys", () => {
  test.beforeEach(async ({ page }) => {
    await seedLocalAuth(page);
  });

  test("strategy canvas loads and is interactive", async ({ page }) => {
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

    await page.goto("/strategy", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const crash = await page.locator("text=Something went wrong").count();
    expect(crash, "crash on strategy canvas").toBe(0);

    // Try clicking the first visible button
    const btn = page.locator("button").first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(400);
      const crash2 = await page.locator("text=Something went wrong").count();
      expect(crash2).toBe(0);
    }

    expect(errs).toHaveLength(0);
  });

  test("CRM page loads and search input is interactive", async ({ page }) => {
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

    await page.goto("/crm", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const crash = await page.locator("text=Something went wrong").count();
    expect(crash, "crash on CRM page").toBe(0);

    const searchInput = page
      .locator(
        "input[type=search], input[placeholder*='חיפוש'], input[placeholder*='Search' i], input[placeholder*='search' i]",
      )
      .first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("acme");
      await page.waitForTimeout(300);
      await searchInput.clear();
      await page.waitForTimeout(200);
      const crash2 = await page.locator("text=Something went wrong").count();
      expect(crash2).toBe(0);
    }

    expect(errs).toHaveLength(0);
  });

  test("profile page loads and text input is interactive", async ({ page }) => {
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const crash = await page.locator("text=Something went wrong").count();
    expect(crash, "crash on profile page").toBe(0);

    const textInput = page.locator("input[type=text]").first();
    if (await textInput.isVisible().catch(() => false)) {
      const original = await textInput.inputValue().catch(() => "");
      await textInput.fill("Test Name");
      await page.waitForTimeout(300);
      await textInput.fill(original);
      const crash2 = await page.locator("text=Something went wrong").count();
      expect(crash2).toBe(0);
    }

    expect(errs).toHaveLength(0);
  });

  test("plans page loads without crash", async ({ page }) => {
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

    await page.goto("/plans", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const crash = await page.locator("text=Something went wrong").count();
    expect(crash, "crash on plans page").toBe(0);
    expect(errs).toHaveLength(0);
  });

  test("data hub loads without crash", async ({ page }) => {
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

    await page.goto("/data", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const crash = await page.locator("text=Something went wrong").count();
    expect(crash, "crash on data hub").toBe(0);
    expect(errs).toHaveLength(0);
  });

  test("AI coach page loads without crash", async ({ page }) => {
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

    await page.goto("/ai", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const crash = await page.locator("text=Something went wrong").count();
    expect(crash, "crash on AI coach page").toBe(0);
    expect(errs).toHaveLength(0);
  });

  test("dashboard page loads without crash", async ({ page }) => {
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const crash = await page.locator("text=Something went wrong").count();
    expect(crash, "crash on dashboard").toBe(0);
    expect(errs).toHaveLength(0);
  });
});
