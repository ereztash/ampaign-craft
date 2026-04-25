/**
 * Wizard flood: run through every wizard step with extreme inputs to find
 * crashes, infinite spinners, or broken validation.
 * LLM calls are disabled (VITE_AI_COPY_ENABLED=false).
 */
import { test, expect } from "@playwright/test";
import { seedLocalAuth, EDGE_STRINGS } from "./helpers";

test.beforeEach(async ({ page }) => {
  await seedLocalAuth(page);
});

test("quick wizard - all steps with extreme text", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

  await page.goto("/wizard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  // Fill any visible text inputs with a long Hebrew string
  const longHe = "מוצר עסקי מדהים - תיאור מפורט ".repeat(50);
  const inputs = page.locator("input[type=text], textarea");
  const count = await inputs.count();
  for (let i = 0; i < count; i++) {
    try {
      await inputs.nth(i).fill(longHe);
    } catch { /* skip read-only */ }
  }

  // Click through every "Next" button up to 10 times
  for (let step = 0; step < 10; step++) {
    const nextBtn = page.locator("button:has-text('הבא'), button:has-text('Next'), button:has-text('המשך')").first();
    const visible = await nextBtn.isVisible().catch(() => false);
    if (!visible) break;
    await nextBtn.click().catch(() => {});
    await page.waitForTimeout(600);
  }

  const crash = await page.locator("text=Something went wrong").count();
  expect(crash, "React crash during wizard flow").toBe(0);

  const critical = errs.filter(
    (e) => !e.includes("supabase") && !e.includes("placeholder") && !e.includes("fetch")
  );
  if (critical.length) console.warn("[wizard-flood]", critical);
});

test("quick wizard - empty submit", async ({ page }) => {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

  await page.goto("/wizard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);

  // Click Next immediately on each step without filling anything
  for (let step = 0; step < 10; step++) {
    const nextBtn = page.locator("button:has-text('הבא'), button:has-text('Next'), button:has-text('המשך')").first();
    const visible = await nextBtn.isVisible().catch(() => false);
    if (!visible) break;
    await nextBtn.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  const crash = await page.locator("text=Something went wrong").count();
  expect(crash, "React crash on empty wizard").toBe(0);
  expect(errs.length, `page errors on empty wizard: ${errs.join(", ")}`).toBe(0);
});

test("quick wizard - XSS and SQL inputs", async ({ page }) => {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

  await page.goto("/wizard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);

  const xssPayloads = [
    "<script>window.__XSS__=1</script>",
    "'; DROP TABLE users; --",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
  ];

  for (const payload of xssPayloads) {
    const inputs = page.locator("input[type=text], textarea");
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      await inputs.nth(i).fill(payload).catch(() => {});
    }
  }

  // Check XSS didn't execute
  const xssExecuted = await page.evaluate(() => (window as unknown as Record<string, unknown>).__XSS__ === 1);
  expect(xssExecuted, "XSS payload executed!").toBe(false);

  const crash = await page.locator("text=Something went wrong").count();
  expect(crash).toBe(0);
  expect(errs).toHaveLength(0);
});

test("differentiation wizard - phase 1 edge inputs", async ({ page }) => {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

  await page.goto("/differentiate", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  // Phase 1: fill business name with long string
  const nameInput = page.locator("input").first();
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill("א".repeat(10_000));
    await page.waitForTimeout(300);
  }

  // Fill all text areas
  const textareas = page.locator("textarea");
  const taCount = await textareas.count();
  for (let i = 0; i < taCount; i++) {
    await textareas.nth(i).fill("מוצר עסקי ".repeat(500)).catch(() => {});
  }

  const crash = await page.locator("text=Something went wrong").count();
  expect(crash, "Crash on differentiation phase 1 flood").toBe(0);
  expect(errs).toHaveLength(0);
});

test("pricing module - loads and initial render", async ({ page }) => {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

  await page.goto("/pricing", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const crash = await page.locator("text=Something went wrong").count();
  expect(crash).toBe(0);

  // Try clicking first interactive element
  const btns = page.locator("button").first();
  if (await btns.isVisible().catch(() => false)) {
    await btns.click().catch(() => {});
    await page.waitForTimeout(400);
    const crash2 = await page.locator("text=Something went wrong").count();
    expect(crash2, "Crash after first button click on pricing").toBe(0);
  }

  expect(errs).toHaveLength(0);
});

test("retention module - loads without crash", async ({ page }) => {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

  await page.goto("/retention", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const crash = await page.locator("text=Something went wrong").count();
  expect(crash).toBe(0);
  expect(errs).toHaveLength(0);
});

test("sales module - loads without crash", async ({ page }) => {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

  await page.goto("/sales", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const crash = await page.locator("text=Something went wrong").count();
  expect(crash).toBe(0);
  expect(errs).toHaveLength(0);
});

test("language toggle doesn't crash", async ({ page }) => {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(`PAGE_ERROR: ${e.message}`));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);

  // Toggle language button if visible
  const langBtn = page.locator("[data-testid=lang-toggle], button:has-text('EN'), button:has-text('HE'), button:has-text('עב')").first();
  if (await langBtn.isVisible().catch(() => false)) {
    await langBtn.click();
    await page.waitForTimeout(400);
    await langBtn.click();
    await page.waitForTimeout(400);
  }

  const crash = await page.locator("text=Something went wrong").count();
  expect(crash).toBe(0);
  expect(errs).toHaveLength(0);
});
