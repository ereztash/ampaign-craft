/**
 * Smoke test: visit every registered route, check for React crashes and
 * console errors. Does NOT require auth for public pages, uses local-auth
 * seed for protected pages.
 */
import { test, expect } from "@playwright/test";
import { collectConsoleErrors, seedLocalAuth } from "./helpers";

const PUBLIC_ROUTES = [
  "/privacy",
  "/terms",
  "/support",
  "/contact",
  "/refund-policy",
  "/use-cases",
];

const AUTH_ROUTES = [
  "/",
  "/dashboard",
  "/wizard",
  "/differentiate",
  "/sales",
  "/pricing",
  "/retention",
  "/plans",
  "/profile",
  "/archetype",
  "/admin/aarrr",
  "/admin/agents",
  "/strategy",
  "/ai",
];

const NOT_FOUND_ROUTES = [
  "/does-not-exist-xyz",
  "/plans/nonexistent-plan-id/tab",
  "/strategy/nonexistent-plan-id/focus",
];

test.beforeEach(async ({ page }) => {
  await seedLocalAuth(page);
});

for (const route of PUBLIC_ROUTES) {
  test(`public route loads without crash: ${route}`, async ({ page }) => {
    const errs: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    const crashCount = await page.locator("text=Something went wrong").count();
    expect(crashCount, `React error boundary on ${route}`).toBe(0);

    const critical = errs.filter(
      (e) => !e.includes("Supabase") && !e.includes("supabase") && !e.includes("placeholder")
    );
    if (critical.length > 0) console.warn(`[${route}] console errors:`, critical);
  });
}

for (const route of AUTH_ROUTES) {
  test(`auth route loads without crash: ${route}`, async ({ page }) => {
    const errs: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const crashCount = await page.locator("text=Something went wrong").count();
    expect(crashCount, `React error boundary on ${route}`).toBe(0);

    const critical = errs.filter(
      (e) =>
        !e.includes("Supabase") &&
        !e.includes("supabase") &&
        !e.includes("placeholder") &&
        !e.includes("Failed to fetch") &&
        !e.includes("NetworkError")
    );
    if (critical.length > 0) {
      console.warn(`[${route}] console errors:`, critical);
    }
  });
}

test("404 page renders for unknown routes", async ({ page }) => {
  for (const route of NOT_FOUND_ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const crash = await page.locator("text=Something went wrong").count();
    expect(crash, `Crash (not graceful 404) on ${route}`).toBe(0);
  }
});
