# Security policy

## Supported versions

We ship security fixes for the current `main` branch and the most recent
deployed release. Older tags are not maintained.

## Reporting a vulnerability

Please do **not** open a public GitHub issue for security reports. Instead:

1. Email `security@funnelforge.app` with a description and reproduction
   steps. We respond within 3 business days.
2. If you need encrypted communication, request a PGP key in your first
   email and we will send one.

When reporting, include:
- A clear description of the issue and affected components.
- Step-by-step reproduction or proof-of-concept code.
- The impact you believe this has (data exposure, privilege escalation,
  denial of service, etc.).
- Any suggested mitigations you have identified.

## Scope

In scope:
- The FunnelForge web application (`ampaign-craft` repo).
- All Supabase Edge Functions under `supabase/functions/`.
- Database RLS policies and SQL functions under `supabase/migrations/`.

Out of scope:
- Third-party services (Stripe, Supabase, Anthropic, OpenAI, Meta, Resend)
  running on their own infrastructure. Please report those upstream.
- Social engineering of FunnelForge staff.
- DoS via resource exhaustion on unauthenticated endpoints (these are
  rate-limited but not hardened against a large botnet).

## Disclosure timeline

We follow coordinated disclosure. After a confirmed report we commit to:
- Acknowledge within 3 business days.
- Provide an initial triage within 7 business days.
- Ship a fix or mitigation within 30 days for critical and high severity
  issues; 90 days for medium; best effort for low.
- Publish an advisory once a fix is deployed, crediting the reporter if
  they wish.

## Rewards

We currently do not run a paid bug bounty program. We are happy to credit
reporters publicly and provide swag for accepted reports.

## Non-code security hygiene

- All secrets live in Supabase Edge Function environment or Vercel
  project env, never in the repo.
- The repo is scanned by Gitleaks on every push and PR.
- Dependencies are monitored by Dependabot with a weekly update cadence.
- `npm audit --audit-level=critical` is enforced in CI; high-severity
  advisories are reviewed on the dedicated Security workflow.
