# ADR-0002: Meta Access Token Storage — sessionStorage + CSP

**Date:** 2026-04-17  
**Status:** Accepted  
**Deciders:** Erez Tash

## Context

The Meta OAuth access token (60-day expiry) was stored in `localStorage` under
`"meta_auth"`. XSS on any same-origin page → attacker reads token → account takeover
for up to 60 days. Ads data (spend, audience targeting) is commercially sensitive.

## Decision

**Beta:** Migrate to `sessionStorage` + strict Content-Security-Policy meta tag.
- Token is cleared on tab close (reduces exposure window from 60 days to session length).
- CSP allowlists `connect-src` to known origins only.

**Post-Beta (planned):** httpOnly cookie + edge-function proxy (ADR-0003, not yet written).

## Rationale

`sessionStorage` requires no backend changes and ships in hours. The httpOnly cookie
approach requires a proxy endpoint for every Meta API call (~6h additional work), which
exceeds Beta scope. Defense-in-depth (CSP + sessionStorage) is sufficient for a
closed Beta of ≤500 users.

## Alternatives Considered

| Option | Pros | Cons | Rejected because |
|--------|------|------|-----------------|
| Keep localStorage | No change needed | 60-day XSS window | Unacceptable risk |
| httpOnly cookie + proxy | Proper solution; token never in JS | Requires backend proxy for all Meta calls; 6h scope | Post-Beta |
| Encrypt in localStorage | Reduces plaintext exposure | Key must also be in JS; marginal gain | False security |

## Consequences

**Positive:** XSS window reduced from 60 days to browser session.  
**Negative:** User must reconnect Meta after closing browser tab.  
**Risks:** sessionStorage still readable by same-origin XSS; CSP is the second layer.

## Review Trigger

When Beta exceeds 1,000 users or first XSS vulnerability report. Implement httpOnly
cookie proxy at that point.
