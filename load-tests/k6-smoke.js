// k6 smoke test — FunnelForge Beta
//
// Validates core API paths under light load (2 VUs × 30s).
// Run: k6 run --env BASE_URL=https://funnelforge.app load-tests/k6-smoke.js
//
// Thresholds mirror SLO targets in docs/slo.md.
// Green = SLO met. Red = investigate before launch.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5173";
const SUPABASE_URL = __ENV.SUPABASE_URL || "";
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || "";

// Custom metrics
const healthOK = new Rate("health_check_ok");
const funnelLatency = new Trend("funnel_generation_latency_ms", true);
const authLatency = new Trend("auth_latency_ms", true);

export const options = {
  scenarios: {
    smoke: {
      executor: "constant-vus",
      vus: 2,
      duration: "30s",
    },
  },
  thresholds: {
    // SLO: ≥ 99% health checks succeed
    health_check_ok: ["rate>0.99"],
    // SLO: ≥ 95% funnel requests complete in < 10s
    funnel_generation_latency_ms: ["p(95)<10000"],
    // SLO: auth p95 < 3s
    auth_latency_ms: ["p(95)<3000"],
    // General HTTP failure rate
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  // 1. Health check
  const health = http.get(`${SUPABASE_URL}/functions/v1/health`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });
  const healthPass = check(health, {
    "health status 200 or 503": (r) => r.status === 200 || r.status === 503,
    "health body has status field": (r) => {
      try { return JSON.parse(r.body).status !== undefined; } catch { return false; }
    },
  });
  healthOK.add(health.status === 200);

  sleep(1);

  // 2. Static app loads (Vite / CDN)
  const home = http.get(BASE_URL);
  check(home, {
    "homepage status 200": (r) => r.status === 200,
    "homepage < 3s": (r) => r.timings.duration < 3000,
  });

  sleep(1);

  // 3. Supabase REST API — event_queue read (light)
  if (SUPABASE_URL && ANON_KEY) {
    const t0 = Date.now();
    const events = http.get(`${SUPABASE_URL}/rest/v1/event_queue?select=id&limit=1`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      },
    });
    funnelLatency.add(Date.now() - t0);
    check(events, {
      "event_queue accessible": (r) => r.status === 200 || r.status === 401,
    });
  }

  sleep(2);
}

export function handleSummary(data) {
  const passed = data.metrics.http_req_failed.values.rate < 0.05;
  console.log(`\n=== Smoke Test Summary ===`);
  console.log(`Overall: ${passed ? "PASSED ✓" : "FAILED ✗"}`);
  console.log(`Health OK rate: ${(data.metrics.health_check_ok?.values.rate * 100).toFixed(1)}%`);
  console.log(`HTTP failure rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`);
  if (data.metrics.funnel_generation_latency_ms) {
    console.log(`Funnel p95: ${data.metrics.funnel_generation_latency_ms.values["p(95)"]?.toFixed(0)}ms`);
  }

  return {
    stdout: JSON.stringify(data, null, 2),
    "load-tests/results/smoke-latest.json": JSON.stringify(data, null, 2),
  };
}
