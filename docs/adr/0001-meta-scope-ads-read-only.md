# ADR-0001: Meta OAuth Scope — ads_read Only for Beta

**Date:** 2026-04-17  
**Status:** Accepted  
**Deciders:** Erez Tash

## Context

`src/services/metaApi.ts` originally requested `ads_read,ads_management`. The UI at
`src/components/MetaConnect.tsx` stated "ads_read only". This mismatch causes:
1. Meta App Review rejection (scope must match stated use).
2. Trust erosion — users see a narrower permission promise than what is actually requested.

## Decision

Request only `ads_read` during Beta. `ads_management` deferred to a post-Beta flow
with explicit user confirmation and a separate Meta App Review submission.

## Rationale

Beta goal is read-only analytics (spend, CTR, CPC, reach). Write access is not needed
until Campaign Cockpit ships (post-Beta). Narrower scope = faster App Review approval,
lower risk of rejection, higher user trust.

## Alternatives Considered

| Option | Pros | Cons | Rejected because |
|--------|------|------|-----------------|
| Request both scopes now | No second Meta review later | UI must disclose ads_management; App Review may reject; users may refuse | Higher rejection risk for Beta |
| Request ads_management only | Covers everything | Misleads users; violates principle of least privilege | Contradicts UI promise |

## Consequences

**Positive:** Faster Meta App Review. Users see exactly what they consent to.  
**Negative:** When Campaign Cockpit ships, a second OAuth prompt will be required.  
**Risks:** Users who connected during Beta must re-auth to grant ads_management later.

## Review Trigger

When Campaign Cockpit feature is ready for Beta. Update `src/services/metaApi.ts:60`
and `src/components/MetaConnect.tsx` disclosure text at that point.
