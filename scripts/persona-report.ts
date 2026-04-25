// ═══════════════════════════════════════════════
// scripts/persona-report.ts
//
// Simulates 3 user personas navigating the app and generates
// a self-contained HTML report with screenshots and assertions.
//
// Usage:
//   npx tsx scripts/persona-report.ts
//
// Prerequisites:
//   - Dev server running on http://localhost:5173  (npm run dev)
//   - Playwright installed  (already in devDependencies)
//
// Output:
//   reports/persona-YYYY-MM-DD-HHMM.html  (opens automatically)
// ═══════════════════════════════════════════════

import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { ALL_PERSONAS, type Persona, type PersonaAssertion } from "./persona-data.js";

const BASE_URL = process.env.APP_URL ?? "http://localhost:5173";
const SETTLE_MS = 1200; // ms to wait after navigation for React to settle

// ─── Types ────────────────────────────────────────────────────────────────────

interface SurfaceResult {
  route: string;
  screenshotB64: string;
  consoleErrors: string[];
  assertions: { label: string; pass: boolean; detail: string }[];
}

interface PersonaResult {
  persona: Persona;
  surfaces: SurfaceResult[];
  totalPass: number;
  totalFail: number;
  durationMs: number;
}

// ─── Dev server check ─────────────────────────────────────────────────────────

async function checkDevServer(): Promise<boolean> {
  try {
    const { default: http } = await import("http");
    return new Promise((resolve) => {
      const req = http.get(BASE_URL, (res) => {
        resolve(res.statusCode !== undefined && res.statusCode < 500);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(3000, () => { req.destroy(); resolve(false); });
    });
  } catch {
    return false;
  }
}

// ─── Persona runner ───────────────────────────────────────────────────────────

async function runPersona(
  browser: import("@playwright/test").Browser,
  persona: Persona,
): Promise<PersonaResult> {
  const t0 = Date.now();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "he-IL",
  });
  const page = await ctx.newPage();

  // Collect console errors during the whole session
  const sessionErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") sessionErrors.push(msg.text());
  });
  page.on("pageerror", (err) => sessionErrors.push(`PAGE_ERROR: ${err.message}`));

  // ── 1. Seed localStorage ────────────────────────────────────────────────────
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate((state) => {
    localStorage.clear();
    for (const [key, value] of Object.entries(state)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, persona.localStorage as Record<string, unknown>);

  // ── 2. Visit each surface ───────────────────────────────────────────────────
  const surfaces: SurfaceResult[] = [];

  for (const route of persona.surfacesToVisit) {
    const routeErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") routeErrors.push(msg.text());
    });

    await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(SETTLE_MS);

    // Screenshot
    const buf = await page.screenshot({ fullPage: false });
    const b64 = buf.toString("base64");

    // Run assertions for this route
    const routeAssertions = persona.assertions.filter((a) => a.route === route);
    const results: SurfaceResult["assertions"] = [];

    // Always check for crash first
    const crashCount = await page.locator("text=Something went wrong").count();
    results.push({
      label: "No React crash",
      pass: crashCount === 0,
      detail: crashCount > 0 ? "Error boundary triggered" : "OK",
    });

    // Persona-specific assertions
    for (const a of routeAssertions) {
      let pass = false;
      let detail = "";
      if (a.expect) {
        const count = await page.getByText(a.expect, { exact: false }).count();
        pass = count > 0;
        detail = pass ? `Found "${a.expect}"` : `"${a.expect}" not found`;
      } else if (a.expectAbsent) {
        const count = await page.getByText(a.expectAbsent, { exact: false }).count();
        pass = count === 0;
        detail = pass ? `"${a.expectAbsent}" correctly absent` : `"${a.expectAbsent}" unexpectedly present`;
      }
      results.push({ label: a.label, pass, detail });
    }

    surfaces.push({
      route,
      screenshotB64: b64,
      consoleErrors: [...routeErrors],
      assertions: results,
    });
  }

  await ctx.close();

  const totalPass = surfaces.flatMap((s) => s.assertions).filter((a) => a.pass).length;
  const totalFail = surfaces.flatMap((s) => s.assertions).filter((a) => !a.pass).length;

  return {
    persona,
    surfaces,
    totalPass,
    totalFail,
    durationMs: Date.now() - t0,
  };
}

// ─── HTML report ─────────────────────────────────────────────────────────────

function buildHtml(results: PersonaResult[], runAt: Date): string {
  const totalPass = results.reduce((s, r) => s + r.totalPass, 0);
  const totalFail = results.reduce((s, r) => s + r.totalFail, 0);
  const totalTests = totalPass + totalFail;
  const overallOk = totalFail === 0;

  const surfaceLabel = (route: string) => route === "/" ? "CommandCenter" : route.replace("/", "");

  const personaCards = results.map((r) => {
    const { persona, surfaces, totalPass: pp, totalFail: pf, durationMs } = r;
    const pct = Math.round((pp / (pp + pf)) * 100);

    const surfaceRows = surfaces.map((s) => {
      const passCount = s.assertions.filter((a) => a.pass).length;
      const failCount = s.assertions.filter((a) => !a.pass).length;
      const errorsHtml = s.consoleErrors.length > 0
        ? `<div class="console-errors">🔴 ${s.consoleErrors.slice(0, 3).map(e => escHtml(e.slice(0, 120))).join("<br>")}</div>`
        : "";
      const assertRows = s.assertions.map((a) =>
        `<tr class="${a.pass ? "pass" : "fail"}">
           <td>${a.pass ? "✅" : "❌"}</td>
           <td>${escHtml(a.label)}</td>
           <td class="detail">${escHtml(a.detail)}</td>
         </tr>`
      ).join("");

      return `
        <div class="surface">
          <div class="surface-header">
            <span class="route-badge">${escHtml(s.route)}</span>
            <span class="surface-name">${escHtml(surfaceLabel(s.route))}</span>
            <span class="mini-badge ${failCount > 0 ? "fail" : "pass"}">${passCount}/${passCount + failCount}</span>
          </div>
          <div class="surface-body">
            <div class="screenshot-wrap">
              <img src="data:image/png;base64,${s.screenshotB64}" alt="${escHtml(s.route)}" loading="lazy" />
            </div>
            <div class="assertions-wrap">
              ${errorsHtml}
              <table class="assertions-table">
                <thead><tr><th></th><th>Assertion</th><th>Detail</th></tr></thead>
                <tbody>${assertRows}</tbody>
              </table>
            </div>
          </div>
        </div>`;
    }).join("");

    return `
      <section class="persona-card" style="--accent: ${escHtml(persona.color)}">
        <div class="persona-header" style="border-color: ${escHtml(persona.color)}">
          <div class="persona-avatar" style="background: ${escHtml(persona.color)}">${escHtml(persona.name[0])}</div>
          <div class="persona-meta">
            <h2>${escHtml(persona.name)}</h2>
            <p class="persona-title">${escHtml(persona.title)}</p>
            <div class="persona-tags">
              <span class="tag need">need: ${escHtml(persona.need)}</span>
              <span class="tag pain">pain: ${escHtml(persona.pain)}</span>
              <span class="tag target">→ ${escHtml(persona.routingTarget)}</span>
              <span class="tag promise">~${persona.promiseMinutes} min</span>
            </div>
          </div>
          <div class="persona-score">
            <div class="score-ring ${pf > 0 ? "fail" : "pass"}">${pct}%</div>
            <div class="score-sub">${pp}/${pp + pf} passed</div>
            <div class="score-sub">${(durationMs / 1000).toFixed(1)}s</div>
          </div>
        </div>
        <div class="surfaces">${surfaceRows}</div>
      </section>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FunnelForge — Persona Report ${runAt.toLocaleDateString("he-IL")}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f1117; color: #e2e8f0; line-height: 1.5; }
    a { color: #60a5fa; }

    /* ── Header ── */
    .report-header { background: #1e2130; padding: 24px 32px; border-bottom: 1px solid #2d3348; display: flex; align-items: center; justify-content: space-between; }
    .report-title { font-size: 1.4rem; font-weight: 700; color: #f8fafc; }
    .report-meta { font-size: 0.8rem; color: #94a3b8; }
    .overall-badge { font-size: 1.1rem; font-weight: 700; padding: 6px 18px; border-radius: 9999px; }
    .overall-badge.pass { background: #064e3b; color: #34d399; }
    .overall-badge.fail { background: #450a0a; color: #f87171; }

    /* ── Summary bar ── */
    .summary-bar { background: #161824; padding: 12px 32px; border-bottom: 1px solid #2d3348; display: flex; gap: 24px; font-size: 0.85rem; color: #94a3b8; }
    .summary-bar strong { color: #e2e8f0; }

    /* ── Persona cards ── */
    .persona-card { margin: 24px 32px; border: 1px solid #2d3348; border-radius: 12px; overflow: hidden; }
    .persona-header { padding: 20px 24px; background: #1e2130; display: flex; gap: 16px; align-items: flex-start; border-top: 3px solid; }
    .persona-avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 700; color: #fff; flex-shrink: 0; }
    .persona-meta { flex: 1; }
    .persona-meta h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 2px; }
    .persona-title { font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px; }
    .persona-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag { font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; font-weight: 600; }
    .tag.need { background: #1e3a5f; color: #93c5fd; }
    .tag.pain { background: #2e1065; color: #c4b5fd; }
    .tag.target { background: #1c3527; color: #6ee7b7; }
    .tag.promise { background: #3b2f00; color: #fbbf24; }
    .persona-score { text-align: center; min-width: 70px; }
    .score-ring { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 800; margin: 0 auto 4px; }
    .score-ring.pass { background: #064e3b; color: #34d399; border: 2px solid #34d399; }
    .score-ring.fail { background: #450a0a; color: #f87171; border: 2px solid #f87171; }
    .score-sub { font-size: 0.7rem; color: #64748b; }

    /* ── Surfaces ── */
    .surfaces { padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }
    .surface { border: 1px solid #2d3348; border-radius: 8px; overflow: hidden; }
    .surface-header { padding: 8px 14px; background: #1a1f2e; display: flex; align-items: center; gap: 10px; font-size: 0.82rem; }
    .route-badge { font-family: monospace; background: #0f172a; padding: 2px 8px; border-radius: 4px; color: #7dd3fc; font-size: 0.78rem; }
    .surface-name { color: #e2e8f0; font-weight: 600; flex: 1; }
    .mini-badge { font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; font-weight: 700; }
    .mini-badge.pass { background: #064e3b; color: #34d399; }
    .mini-badge.fail { background: #450a0a; color: #f87171; }
    .surface-body { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
    .screenshot-wrap { border-left: 1px solid #2d3348; overflow: hidden; }
    .screenshot-wrap img { width: 100%; display: block; }
    .assertions-wrap { padding: 12px; background: #0f1117; }
    .console-errors { font-size: 0.7rem; color: #f87171; background: #2d0000; padding: 6px; border-radius: 4px; margin-bottom: 8px; word-break: break-all; }
    .assertions-table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
    .assertions-table th { text-align: right; color: #64748b; padding: 4px 6px; border-bottom: 1px solid #2d3348; font-weight: 600; }
    .assertions-table td { padding: 5px 6px; border-bottom: 1px solid #1e2130; vertical-align: top; }
    .assertions-table tr.fail td { color: #fca5a5; }
    .assertions-table tr.pass td { color: #a7f3d0; }
    .assertions-table .detail { color: #64748b; font-size: 0.72rem; }
    .assertions-table tr.fail .detail { color: #f87171; }

    /* ── Footer ── */
    .report-footer { text-align: center; padding: 32px; color: #334155; font-size: 0.78rem; }
  </style>
</head>
<body>
  <header class="report-header">
    <div>
      <div class="report-title">🎭 FunnelForge — Persona Simulation Report</div>
      <div class="report-meta">
        ${runAt.toLocaleString("he-IL")} &nbsp;·&nbsp;
        ${results.length} פרסונות &nbsp;·&nbsp;
        ${results.reduce((s, r) => s + r.persona.surfacesToVisit.length, 0)} משטחים &nbsp;·&nbsp;
        ${totalTests} assertions
      </div>
    </div>
    <div class="overall-badge ${overallOk ? "pass" : "fail"}">
      ${overallOk ? "✅ All Pass" : `❌ ${totalFail} Failed`}
    </div>
  </header>

  <div class="summary-bar">
    <span><strong>${totalPass}</strong> passed</span>
    <span><strong>${totalFail}</strong> failed</span>
    <span><strong>${results.map((r) => (r.durationMs / 1000).toFixed(1) + "s").join(" · ")}</strong> per persona</span>
    <span>Base URL: <strong>${escHtml(BASE_URL)}</strong></span>
  </div>

  ${personaCards}

  <footer class="report-footer">
    Generated by scripts/persona-report.ts &nbsp;·&nbsp; ${runAt.toISOString()}
  </footer>
</body>
</html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎭  FunnelForge Persona Report");
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Personas: ${ALL_PERSONAS.map((p) => p.name).join(", ")}\n`);

  // Check dev server
  const serverOk = await checkDevServer();
  if (!serverOk) {
    console.error(`❌  Dev server not reachable at ${BASE_URL}`);
    console.error("   Run  npm run dev  in another terminal and try again.");
    process.exit(1);
  }
  console.log("✅  Dev server reachable\n");

  // Ensure output dir
  const reportsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const runAt = new Date();
  const browser = await chromium.launch({ headless: true });

  const results: PersonaResult[] = [];

  for (const persona of ALL_PERSONAS) {
    process.stdout.write(`  Running ${persona.name} (${persona.need}×${persona.pain}) … `);
    const result = await runPersona(browser, persona);
    results.push(result);
    const status = result.totalFail === 0 ? "✅" : `❌ ${result.totalFail} fail`;
    console.log(`${status}  (${(result.durationMs / 1000).toFixed(1)}s)`);
  }

  await browser.close();

  // Generate report
  const stamp = runAt.toISOString().slice(0, 16).replace("T", "-").replace(":", "");
  const outPath = path.join(reportsDir, `persona-${stamp}.html`);
  fs.writeFileSync(outPath, buildHtml(results, runAt));

  console.log(`\n📄  Report saved → ${outPath}`);

  // Print summary
  const totalPass = results.reduce((s, r) => s + r.totalPass, 0);
  const totalFail = results.reduce((s, r) => s + r.totalFail, 0);
  console.log(`   ${totalPass} passed, ${totalFail} failed\n`);

  if (totalFail > 0) {
    console.log("Failed assertions:");
    for (const r of results) {
      for (const s of r.surfaces) {
        for (const a of s.assertions.filter((a) => !a.pass)) {
          console.log(`   ❌  [${r.persona.name}] ${s.route} — ${a.label}: ${a.detail}`);
        }
      }
    }
    console.log();
  }

  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
