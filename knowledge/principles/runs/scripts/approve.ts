// ═══════════════════════════════════════════════
// knowledge/principles/runs/scripts/approve.ts
//
// Gate management for the Phase 0 → Phase 1 transition.
//
// Usage:
//   npm run playbook:approve -- --candidate <slug>             # mark approved
//   npm run playbook:approve -- --candidate <slug> --reject    # mark rejected
//   npm run playbook:approve -- --candidate <slug> --skip      # mark skipped
//   npm run playbook:approve -- --candidate <slug> --status    # show current
//
// The Synthesizer will refuse to run unless STATUS is "approved" for the
// candidate. This protects the anchor: a thin or biased extraction would
// produce invalid synthesis comparisons downstream.
// ═══════════════════════════════════════════════

import {
  parseArgs,
  requireArg,
  readGateStatus,
  writeGateStatus,
  type GateStatus,
} from "./utils.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = requireArg(args, "candidate");

  const isStatus = args.status === true;
  const isReject = args.reject === true;
  const isSkip = args.skip === true;

  if (isStatus) {
    const status = await readGateStatus(slug);
    if (status === null) {
      console.log(`[approve] ${slug}: no STATUS file (extraction has not run yet)`);
      process.exit(2);
    }
    console.log(`[approve] ${slug}: ${status}`);
    return;
  }

  const flags = [isReject, isSkip].filter(Boolean).length;
  if (flags > 1) {
    throw new Error("Only one of --reject, --skip may be set at a time.");
  }

  const newStatus: GateStatus = isReject
    ? "rejected"
    : isSkip
      ? "skipped"
      : "approved";

  const currentStatus = await readGateStatus(slug);
  if (currentStatus === null) {
    throw new Error(
      `Cannot set status for ${slug}: no extraction has been run yet. ` +
        `Run extract.ts first.`,
    );
  }

  if (currentStatus === newStatus) {
    console.log(`[approve] ${slug}: already ${newStatus}, no change`);
    return;
  }

  await writeGateStatus(slug, newStatus);
  console.log(
    `[approve] ${slug}: ${currentStatus} → ${newStatus}`,
  );

  if (newStatus === "approved") {
    console.log(``);
    console.log(`Next: run synthesis with:`);
    console.log(
      `  npm run playbook:synth -- --candidate ${slug} --runs 3`,
    );
  }
}

main().catch((err) => {
  console.error(`[approve] ERROR: ${(err as Error).message}`);
  process.exit(1);
});
