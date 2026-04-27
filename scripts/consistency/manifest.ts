// ═══════════════════════════════════════════════
// Consistency Audit — Claim Manifest
//
// Single source of truth for every claim this tool verifies.
// To add a claim: append to the appropriate array.
// To change a SOT computation: edit sot-providers.ts.
// To silence a known drift: add to allowlist.json (with expiry).
// ═══════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { NumericClaim, IdentityClaim, SchemaClaim, SchemaViolation } from "./lib/types";
import { walk as walkFiles } from "./lib/walk";
import * as sot from "./lib/sot-providers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, "../..");

// ════════════════════════════════════════════════
// NUMERIC CLAIMS
// ════════════════════════════════════════════════

export const NUMERIC_CLAIMS: NumericClaim[] = [

  // ── Engine counts ──────────────────────────────
  {
    id: "engine-count-total",
    description: "Total non-test .ts files under src/engine/ (recursive)",
    sot: sot.countEngineFiles,
    appearances: [
      {
        file: "README.md",
        pattern: /\d+ specialized agents, (\d+) engines, \d+ closed loops/,
        groupIndex: 1,
        context: "MAS-CC architecture heading",
      },
      {
        file: "README.md",
        pattern: /Pure Engine Layer\s*-\s*(\d+) files/,
        groupIndex: 1,
        context: "Architecture diagram — Pure Engine Layer row",
      },
      {
        file: "README.md",
        pattern: /\|\s*Engines\s*\|\s*(\d+) pure-function engines/,
        groupIndex: 1,
        context: "Engineering Signals table — Engines row",
      },
    ],
    severity: "blocker",
  },

  {
    id: "named-engine-count",
    description: "Files named *Engine.ts under src/engine/ (non-test, recursive)",
    sot: sot.countNamedEngineFiles,
    appearances: [
      {
        file: "README.md",
        pattern: /\((\d+) named \*Engine\.ts/,
        groupIndex: 1,
        context: "Architecture diagram — named *Engine.ts count",
      },
    ],
    severity: "blocker",
  },

  {
    id: "agent-count",
    description: ".ts files (non-test) in src/engine/blackboard/agents/",
    sot: sot.countAgentFiles,
    appearances: [
      {
        file: "README.md",
        pattern: /(\d+) specialized agents/,
        groupIndex: 1,
        context: "MAS-CC architecture heading",
      },
      {
        file: "README.md",
        pattern: /Blackboard \/ MAS-CC — (\d+) agents/,
        groupIndex: 1,
        context: "Architecture diagram — Blackboard row",
      },
      {
        file: "README.md",
        pattern: /\|\s*Agents\s*\|\s*(\d+) files/,
        groupIndex: 1,
        context: "Engineering Signals table — Agents row",
      },
    ],
    severity: "blocker",
  },

  // ── Infrastructure counts ──────────────────────
  {
    id: "migration-count",
    description: ".sql files in supabase/migrations/",
    sot: sot.countMigrations,
    appearances: [
      {
        file: "README.md",
        pattern: /RLS · (\d+) migrations/,
        groupIndex: 1,
        context: "Architecture diagram — Persistence row",
      },
      {
        file: "README.md",
        pattern: /\|\s*Migrations\s*\|\s*(\d+)\s*\|/,
        groupIndex: 1,
        context: "Engineering Signals table — Migrations row",
      },
    ],
    severity: "blocker",
  },

  {
    id: "edge-function-count",
    description: "Directories in supabase/functions/ (excluding _shared)",
    sot: sot.countEdgeFunctions,
    appearances: [
      {
        file: "README.md",
        pattern: /(\d+) Edge Functions/,
        groupIndex: 1,
        context: "Architecture diagram — Persistence row",
      },
    ],
    severity: "blocker",
  },

  // ── UI layer counts ───────────────────────────
  {
    id: "component-count",
    description: "Non-test .tsx files under src/components/ (recursive)",
    sot: sot.countComponents,
    appearances: [
      {
        file: "README.md",
        pattern: /(\d+) components\s*·/,
        groupIndex: 1,
        context: "Architecture diagram — UI layer row",
      },
    ],
    severity: "blocker",
  },

  {
    id: "page-count",
    description: "Non-test .tsx files under src/pages/",
    sot: sot.countPages,
    appearances: [
      {
        file: "README.md",
        pattern: /(\d+) pages\s*·/,
        groupIndex: 1,
        context: "Architecture diagram — UI layer row",
      },
    ],
    severity: "blocker",
  },

  {
    id: "hook-count",
    description: "Non-test .ts/.tsx files under src/hooks/",
    sot: sot.countHooks,
    appearances: [
      {
        file: "README.md",
        pattern: /(\d+) hooks\s*·/,
        groupIndex: 1,
        context: "Architecture diagram — UI layer row",
      },
    ],
    severity: "blocker",
  },

  // ── i18n ──────────────────────────────────────
  {
    id: "i18n-key-count",
    description: "Top-level key count in src/i18n/translations.ts (actual must be >= claimed)",
    sot: sot.countI18nKeys,
    appearances: [
      {
        file: "README.md",
        pattern: /✅ (\d+)\+ keys/,
        groupIndex: 1,
        context: "Competitor Comparison table — Hebrew-native row",
        minOnly: true,
      },
    ],
    severity: "warn",
  },

  // ── Architecture and behavioral counts ────────
  {
    id: "parameter-count",
    description: "PARAMETERS.length in scripts/map-parameters.ts",
    sot: sot.countParameters,
    appearances: [
      {
        file: "CHOICES.md",
        pattern: /(\d+)\/\d+\s*=\s*\*{0,2}100\.0%\*{0,2}\s*SHIPPED/,
        groupIndex: 1,
        context: "CHOICES.md — final metric closure",
      },
    ],
    severity: "blocker",
  },

  {
    id: "archetype-count",
    description: "Members in ArchetypeId union in src/types/archetype.ts",
    sot: sot.countArchetypes,
    appearances: [
      {
        file: "README.md",
        pattern: /✅ (\d+) archetypes/,
        groupIndex: 1,
        context: "Competitor Comparison table — Archetype-adaptive row",
      },
      {
        file: "README.md",
        pattern: /\|\s*Archetypes\s*\|\s*(\d+)\s*\|/,
        groupIndex: 1,
        context: "Engineering Signals table — Archetypes row",
      },
    ],
    severity: "blocker",
  },

  {
    id: "loop-count",
    description: "Number of closed feedback loops (canonical: 6)",
    sot: sot.loopCount,
    appearances: [
      {
        file: "README.md",
        pattern: /\d+ specialized agents, \d+ engines, (\d+) closed loops/,
        groupIndex: 1,
        context: "MAS-CC architecture heading",
      },
      {
        file: "README.md",
        pattern: /✅ (\d+) self-correcting loops/,
        groupIndex: 1,
        context: "Competitor Comparison table — loops row",
      },
      {
        file: "README.md",
        pattern: /\|\s*Closed loops\s*\|\s*(\d+)\s*\|/,
        groupIndex: 1,
        context: "Engineering Signals table — Closed loops row",
      },
    ],
    severity: "blocker",
  },

  // ── Pricing / quotas ──────────────────────────
  {
    id: "tier-pro-price-ils",
    description: "Pro tier monthly price in ILS (canonical: 99)",
    sot: sot.proPriceIls,
    appearances: [
      {
        file: "README.md",
        pattern: /\*\*Pro\*\*\s*\|\s*₪(\d+)\/mo/,
        groupIndex: 1,
        context: "Pricing table — Pro row",
      },
      {
        file: "README.md",
        pattern: /₪(\d+) Pro \//,
        groupIndex: 1,
        context: "Competitor Comparison table — Price row",
      },
    ],
    severity: "blocker",
  },

  {
    id: "tier-business-price-ils",
    description: "Business tier monthly price in ILS (canonical: 249)",
    sot: sot.businessPriceIls,
    appearances: [
      {
        file: "README.md",
        pattern: /\*\*Business\*\*\s*\|\s*₪(\d+)\/mo/,
        groupIndex: 1,
        context: "Pricing table — Business row",
      },
      {
        file: "README.md",
        pattern: /₪\d+ Pro \/ ₪(\d+) Business/,
        groupIndex: 1,
        context: "Competitor Comparison table — Price row",
      },
    ],
    severity: "blocker",
  },

  {
    id: "trial-days",
    description: "Free trial days (derived from create-checkout/index.ts TRIAL_DAYS)",
    sot: sot.getTrialDays,
    appearances: [
      {
        file: "README.md",
        pattern: /(\d+)-day trial/,
        groupIndex: 1,
        context: "Pricing table — Pro row highlights",
      },
    ],
    severity: "blocker",
  },

  {
    id: "pro-aicoach-msgs",
    description: "AI Coach monthly message quota for Pro tier (canonical: 75)",
    sot: sot.proAiCoachMsgs,
    appearances: [
      {
        file: "README.md",
        pattern: /AI Coach (\d+) msgs/,
        groupIndex: 1,
        context: "Pricing table — Pro row highlights",
      },
    ],
    severity: "blocker",
  },

  {
    id: "pro-whatsapp-monthly",
    description: "WhatsApp monthly quota for Pro tier (canonical: 10)",
    sot: sot.proWhatsappMonthly,
    appearances: [
      {
        file: "README.md",
        pattern: /WhatsApp (\d+)\/mo/,
        groupIndex: 1,
        context: "Pricing table — Pro row highlights",
      },
    ],
    severity: "blocker",
  },

  {
    id: "business-seats",
    description: "Seat count for Business tier (canonical: 3)",
    sot: sot.businessSeats,
    appearances: [
      {
        file: "README.md",
        pattern: /(\d+) seats/,
        groupIndex: 1,
        context: "Pricing table — Business row highlights",
      },
    ],
    severity: "warn",
  },

  {
    id: "annual-discount-pct",
    description: "Annual plan discount percentage (canonical: 20)",
    sot: sot.annualDiscountPct,
    appearances: [
      {
        file: "README.md",
        pattern: /Annual plans save (\d+)%/,
        groupIndex: 1,
        context: "Pricing section — annual discount note",
      },
    ],
    severity: "warn",
  },
];

// ════════════════════════════════════════════════
// IDENTITY CLAIMS
// ════════════════════════════════════════════════

function extractArchetypeIds(): Promise<readonly string[]> {
  const src = fs.readFileSync(path.join(REPO, "src/types/archetype.ts"), "utf8");
  const unionMatch = src.match(/export type ArchetypeId\s*=\s*([\s\S]*?)(?:;\s*\n|;\s*$)/);
  if (!unionMatch) return Promise.resolve([]);
  const ids = (unionMatch[1].match(/"\s*([a-z_]+)\s*"/g) ?? []).map((s) =>
    s.replace(/"/g, "").trim(),
  );
  return Promise.resolve(ids);
}

function extractTierIds(): Promise<readonly string[]> {
  const tierFile = path.join(REPO, "src/types/tier.ts");
  if (!fs.existsSync(tierFile)) {
    return Promise.resolve(["free", "pro", "business"]);
  }
  const src = fs.readFileSync(tierFile, "utf8");
  const unionMatch = src.match(/export type Tier\s*=\s*([\s\S]*?)(?:;\s*\n|;\s*$)/);
  if (!unionMatch) return Promise.resolve([]);
  return Promise.resolve(
    (unionMatch[1].match(/"\s*([a-z_]+)\s*"/g) ?? []).map((s) => s.replace(/"/g, "").trim()),
  );
}

function extractEdgeFunctionNames(): Promise<readonly string[]> {
  const dir = path.join(REPO, "supabase/functions");
  if (!fs.existsSync(dir)) return Promise.resolve([]);
  return Promise.resolve(
    fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== "_shared")
      .map((e) => e.name),
  );
}

function extractRoutes(): Promise<readonly string[]> {
  const appFile = path.join(REPO, "src/App.tsx");
  if (!fs.existsSync(appFile)) return Promise.resolve([]);
  const src = fs.readFileSync(appFile, "utf8");
  const routes = (src.match(/path="([^"*]+)"/g) ?? [])
    .map((m) => m.replace(/^path="/, "").replace(/"$/, ""))
    .filter((r) => !r.includes(":") && r !== "*" && r !== "/")
    // Normalize to absolute paths: React Router nested routes use relative paths
    // (e.g. path="home") but navigate() uses absolute paths (e.g. navigate("/home")).
    .map((r) => (r.startsWith("/") ? r : `/${r}`));
  return Promise.resolve([...new Set(routes)]);
}

export const IDENTITY_CLAIMS: IdentityClaim[] = [
  {
    id: "archetype-ids",
    description: "ArchetypeId members must appear consistently across palette, i18n, and classifier",
    canonicalFile: "src/types/archetype.ts",
    canonicalExtractor: extractArchetypeIds,
    consumerScans: [
      {
        label: "ArchetypeThemeProvider palette mapping",
        files: path.join(REPO, "src/providers"),
        pattern: /["'`](strategist|optimizer|pioneer|connector|closer)["'`]/g,
        groupIndex: 1,
      },
      {
        label: "archetypeClassifier output values",
        files: path.join(REPO, "src/engine"),
        pattern: /["'`](strategist|optimizer|pioneer|connector|closer)["'`]/g,
        groupIndex: 1,
      },
    ],
    severity: "blocker",
  },

  {
    id: "tier-ids",
    description: "Tier names (free/pro/business) consistent across PaywallModal, create-checkout, auth context",
    canonicalFile: "src/types/tier.ts",
    canonicalExtractor: extractTierIds,
    consumerScans: [
      {
        label: "PaywallModal tier references",
        files: path.join(REPO, "src/components"),
        pattern: /(?:tier|requiredTier)\s*(?::|===|==|!==)\s*["'`](free|pro|business)["'`]/gi,
        groupIndex: 1,
      },
      {
        label: "create-checkout edge function PRICE_IDS keys",
        files: path.join(REPO, "supabase/functions/create-checkout"),
        pattern: /["'`](free|pro|business)["'`]\s*:/g,
        groupIndex: 1,
      },
    ],
    severity: "blocker",
  },

  {
    id: "edge-function-names",
    description: "supabase.functions.invoke(\"X\") names must match existing function directories",
    canonicalFile: "supabase/functions/",
    canonicalExtractor: extractEdgeFunctionNames,
    consumerScans: [
      {
        label: "Client-side invoke calls in src/",
        files: path.join(REPO, "src"),
        pattern: /\.functions\.invoke\(\s*["'`]([a-z][a-z0-9-]+)["'`]/g,
        groupIndex: 1,
      },
    ],
    severity: "blocker",
  },

  {
    id: "route-paths",
    description: "Route paths declared in App.tsx must have matching navigate()/Link usages",
    canonicalFile: "src/App.tsx",
    canonicalExtractor: extractRoutes,
    consumerScans: [
      {
        label: "navigate() calls in src/",
        files: path.join(REPO, "src"),
        pattern: /navigate\(\s*["'`](\/[a-z][a-z0-9/-]*)["'`]/g,
        groupIndex: 1,
      },
      {
        label: "<Link to=...> in src/",
        files: path.join(REPO, "src"),
        pattern: /to=["'`](\/[a-z][a-z0-9/-]*)["'`]/g,
        groupIndex: 1,
      },
    ],
    severity: "warn",
  },
];

// ════════════════════════════════════════════════
// SCHEMA CLAIMS
// ════════════════════════════════════════════════

function validateRlsCoverage(): Promise<SchemaViolation[]> {
  const migrationsDir = path.join(REPO, "supabase/migrations");
  if (!fs.existsSync(migrationsDir)) {
    return Promise.resolve([{ file: "supabase/migrations", message: "Migrations directory not found" }]);
  }

  const sqlFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => path.join(migrationsDir, f));

  const tablesCreated = new Set<string>();
  const tablesWithRls = new Set<string>();
  const tablesWithPolicy = new Set<string>();
  const tablesDropped = new Set<string>();
  const userDataTables = new Set<string>();

  for (const sqlFile of sqlFiles) {
    const sql = fs.readFileSync(sqlFile, "utf8").toLowerCase();

    for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:\w+\.)?(\w+)\s*\(/g)) {
      tablesCreated.add(m[1]);
    }
    for (const m of sql.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?(?:\w+\.)?(\w+)/g)) {
      tablesDropped.add(m[1]);
    }
    for (const m of sql.matchAll(/alter\s+table\s+(?:\w+\.)?(\w+)\s+enable\s+row\s+level\s+security/g)) {
      tablesWithRls.add(m[1]);
    }
    // Handle quoted names ("policy name") and multi-line format (ON on next line)
    for (const m of sql.matchAll(/create\s+policy\s+(?:"[^"]*"|\w+)\s+on\s+(?:\w+\.)?(\w+)/g)) {
      tablesWithPolicy.add(m[1]);
    }

    // Tables with user_id column or auth.users reference
    for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:\w+\.)?(\w+)\s*\(([\s\S]*?)(?=create\s+table|alter\s+table|create\s+index|create\s+policy|$)/g)) {
      const tableName = m[1];
      const body = m[2] ?? "";
      if (body.includes("user_id") || body.includes("auth.users")) {
        userDataTables.add(tableName);
      }
    }
  }

  const violations: SchemaViolation[] = [];
  for (const table of userDataTables) {
    if (tablesDropped.has(table)) continue;
    if (!tablesWithRls.has(table)) {
      violations.push({
        file: "supabase/migrations",
        message: `Table "${table}" has user_id/auth.users but no ENABLE ROW LEVEL SECURITY found`,
        fixHint: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
      });
    } else if (!tablesWithPolicy.has(table)) {
      violations.push({
        file: "supabase/migrations",
        message: `Table "${table}" has RLS enabled but no CREATE POLICY defined`,
        fixHint: `CREATE POLICY ... ON ${table} ...`,
      });
    }
  }

  return Promise.resolve(violations);
}

// Vite injects these automatically — they must not be required in .env.example.
const VITE_BUILTIN_VARS = new Set(["DEV", "PROD", "MODE", "BASE_URL", "SSR"]);

function validateEnvVarsDeclared(): Promise<SchemaViolation[]> {
  const envExamplePath = path.join(REPO, ".env.example");
  if (!fs.existsSync(envExamplePath)) {
    return Promise.resolve([{ file: ".env.example", message: ".env.example not found" }]);
  }

  const envSrc = fs.readFileSync(envExamplePath, "utf8");
  const declared = new Set<string>(
    (envSrc.match(/^#?\s*([A-Z_][A-Z0-9_]+)\s*=/gm) ?? []).map((line) => {
      const m = line.match(/([A-Z_][A-Z0-9_]+)/);
      return m ? m[1] : "";
    }).filter(Boolean),
  );

  const srcFiles = walkFiles(path.join(REPO, "src"), /\.(ts|tsx)$/).filter(
    (f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"),
  );

  const violations: SchemaViolation[] = [];
  const reported = new Set<string>();

  for (const file of srcFiles) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(/import\.meta\.env\.([A-Z_][A-Z0-9_]+)/g)) {
      const varName = m[1];
      if (VITE_BUILTIN_VARS.has(varName)) continue;
      if (!declared.has(varName) && !reported.has(varName)) {
        reported.add(varName);
        violations.push({
          file: path.relative(REPO, file),
          message: `"${varName}" used in code but not declared in .env.example`,
          fixHint: `Add ${varName}=your-value-here to .env.example`,
        });
      }
    }
  }

  return Promise.resolve(violations);
}

// Supabase auto-injects these into every edge function — no need to document in .env.example.
const SUPABASE_AUTO_INJECTED = new Set([
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
]);

function validateEdgeFunctionEnvVars(): Promise<SchemaViolation[]> {
  const envExamplePath = path.join(REPO, ".env.example");
  const envSrc = fs.existsSync(envExamplePath)
    ? fs.readFileSync(envExamplePath, "utf8")
    : "";

  const declared = new Set<string>(
    (envSrc.match(/^#?\s*([A-Z_][A-Z0-9_]+)\s*=/gm) ?? []).map((line) => {
      const m = line.match(/([A-Z_][A-Z0-9_]+)/);
      return m ? m[1] : "";
    }).filter(Boolean),
  );

  const fnDir = path.join(REPO, "supabase/functions");
  if (!fs.existsSync(fnDir)) return Promise.resolve([]);

  const fnFiles = walkFiles(fnDir, /\.(ts|js)$/).filter(
    (f) => !f.includes("_shared") && !f.endsWith(".test.ts"),
  );

  const violations: SchemaViolation[] = [];
  const reported = new Set<string>();

  for (const file of fnFiles) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(/Deno\.env\.get\(\s*["'`]([A-Z_][A-Z0-9_]+)["'`]\s*\)/g)) {
      const varName = m[1];
      if (SUPABASE_AUTO_INJECTED.has(varName)) continue;
      if (!declared.has(varName) && !reported.has(varName)) {
        reported.add(varName);
        violations.push({
          file: path.relative(REPO, file),
          message: `Deno.env.get("${varName}") in edge function not documented in .env.example`,
          fixHint: `Add a commented entry for ${varName} in .env.example`,
        });
      }
    }
  }

  return Promise.resolve(violations);
}

export const SCHEMA_CLAIMS: SchemaClaim[] = [
  {
    id: "rls-coverage",
    description: "Tables with user_id/auth.users must have RLS enabled and at least one policy",
    validate: validateRlsCoverage,
    severity: "blocker",
  },
  {
    id: "env-vars-declared",
    description: "Every import.meta.env.VAR in src/ must be declared in .env.example",
    validate: validateEnvVarsDeclared,
    severity: "blocker",
  },
  {
    id: "edge-fn-env-vars",
    description: "Every Deno.env.get(\"VAR\") in edge functions must be documented in .env.example",
    validate: validateEdgeFunctionEnvVars,
    severity: "warn",
  },
];
