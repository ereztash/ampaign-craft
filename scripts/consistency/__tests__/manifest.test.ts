#!/usr/bin/env npx tsx
// Self-contained test: verifies no duplicate claim IDs across all claim types.
// Run: npx tsx scripts/consistency/__tests__/manifest.test.ts

import { NUMERIC_CLAIMS, IDENTITY_CLAIMS, SCHEMA_CLAIMS } from "../manifest";
import { BEHAVIORAL_CLAIMS } from "../behavioral-manifest";
import { STRUCTURAL_CLAIMS } from "../structural-manifest";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`);
    process.exit(1);
  }
}

const numericIds = NUMERIC_CLAIMS.map((c) => c.id);
const identityIds = IDENTITY_CLAIMS.map((c) => c.id);
const schemaIds = SCHEMA_CLAIMS.map((c) => c.id);
const behavioralIds = BEHAVIORAL_CLAIMS.map((c) => c.id);
const structuralIds = STRUCTURAL_CLAIMS.map((c) => c.id);
const allIds = [...numericIds, ...identityIds, ...schemaIds, ...behavioralIds, ...structuralIds];

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

// Behavioral: no duplicate IDs
const behavioralSet = new Set(behavioralIds);
assert(behavioralSet.size === behavioralIds.length, `Duplicate behavioral claim IDs: ${behavioralIds.filter((id, i) => behavioralIds.indexOf(id) !== i).join(", ")}`);

// Behavioral: every claim has a non-trivial description
for (const c of BEHAVIORAL_CLAIMS) {
  assert(c.description.length > 5, `Behavioral claim "${c.id}" has too short a description`);
}

// Behavioral: every claim has at least one threshold
for (const c of BEHAVIORAL_CLAIMS) {
  assert(c.thresholds.length > 0, `Behavioral claim "${c.id}" has no thresholds`);
}

// Behavioral: every threshold has at least one acceptedLiteral
for (const c of BEHAVIORAL_CLAIMS) {
  for (const t of c.thresholds) {
    assert(t.acceptedLiterals.length > 0, `Threshold "${t.name}" in claim "${c.id}" has no acceptedLiterals`);
    for (const pattern of t.acceptedLiterals) {
      assert(pattern instanceof RegExp, `acceptedLiteral in "${c.id}.${t.name}" is not a RegExp`);
    }
  }
}

// Structural: no duplicate IDs and non-trivial descriptions
const structuralSet = new Set(structuralIds);
assert(structuralSet.size === structuralIds.length, `Duplicate structural claim IDs: ${structuralIds.filter((id, i) => structuralIds.indexOf(id) !== i).join(", ")}`);
for (const c of STRUCTURAL_CLAIMS) {
  assert(c.description.length > 5, `Structural claim "${c.id}" has too short a description`);
  assert(["edge_fn_resolution", "table_resolution", "engine_registry_resolution"].includes(c.kind), `Structural claim "${c.id}" has unknown kind: ${c.kind}`);
}

// Cross-type: no ID collision across all claim types
const crossAllSet = new Set(allIds);
assert(crossAllSet.size === allIds.length, `Claim ID collides across types: ${allIds.filter((id, i) => allIds.indexOf(id) !== i).join(", ")}`);

console.log(`✓ Manifest test passed: ${NUMERIC_CLAIMS.length} numeric, ${IDENTITY_CLAIMS.length} identity, ${SCHEMA_CLAIMS.length} schema, ${BEHAVIORAL_CLAIMS.length} behavioral, ${STRUCTURAL_CLAIMS.length} structural claims. No duplicates.`);
