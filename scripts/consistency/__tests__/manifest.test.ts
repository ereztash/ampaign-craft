#!/usr/bin/env npx tsx
// Self-contained test: verifies no duplicate claim IDs across all claim types.
// Run: npx tsx scripts/consistency/__tests__/manifest.test.ts

import { NUMERIC_CLAIMS, IDENTITY_CLAIMS, SCHEMA_CLAIMS } from "../manifest";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`);
    process.exit(1);
  }
}

const numericIds = NUMERIC_CLAIMS.map((c) => c.id);
const identityIds = IDENTITY_CLAIMS.map((c) => c.id);
const schemaIds = SCHEMA_CLAIMS.map((c) => c.id);
const allIds = [...numericIds, ...identityIds, ...schemaIds];

// No duplicate IDs within each type
const numericSet = new Set(numericIds);
assert(numericSet.size === numericIds.length, `Duplicate numeric claim IDs: ${numericIds.filter((id, i) => numericIds.indexOf(id) !== i).join(", ")}`);

const identitySet = new Set(identityIds);
assert(identitySet.size === identityIds.length, `Duplicate identity claim IDs: ${identityIds.filter((id, i) => identityIds.indexOf(id) !== i).join(", ")}`);

const schemaSet = new Set(schemaIds);
assert(schemaSet.size === schemaIds.length, `Duplicate schema claim IDs: ${schemaIds.filter((id, i) => schemaIds.indexOf(id) !== i).join(", ")}`);

// No ID collision across types
const allSet = new Set(allIds);
assert(allSet.size === allIds.length, `Claim ID collision across types: ${allIds.filter((id, i) => allIds.indexOf(id) !== i).join(", ")}`);

// Every claim has a non-empty description
for (const c of [...NUMERIC_CLAIMS, ...IDENTITY_CLAIMS, ...SCHEMA_CLAIMS]) {
  assert(c.description.length > 5, `Claim "${c.id}" has too short a description`);
}

// Every numeric claim has at least one appearance
for (const c of NUMERIC_CLAIMS) {
  assert(c.appearances.length > 0, `Numeric claim "${c.id}" has no appearances`);
}

// Every identity claim has at least one consumer scan
for (const c of IDENTITY_CLAIMS) {
  assert(c.consumerScans.length > 0, `Identity claim "${c.id}" has no consumer scans`);
}

console.log(`✓ Manifest test passed: ${NUMERIC_CLAIMS.length} numeric, ${IDENTITY_CLAIMS.length} identity, ${SCHEMA_CLAIMS.length} schema claims. No duplicates.`);
