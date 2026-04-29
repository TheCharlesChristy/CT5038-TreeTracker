# ADR-001: OpenTreeMap Instance Selection

**Status:** Accepted  
**Date:** 2026-04-29  
**Ticket:** SCRUM-160

## Context

OpenTreeMap (OTM) organises all tree data into isolated *instances* — one per organisation. Before any integration work can proceed, the team must decide which instance to use.

The three options are:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Existing public instance** | Read/write against an existing city or organisation instance (e.g. a UK council's instance) | No hosting cost; real existing data | Requires permission; may have data-quality constraints |
| **Self-hosted OTM** | Run our own OTM server | Full control | Significant ops overhead; OTM is a complex Django application |
| **OTM subscription** | Paid hosted instance from the OTM team | Managed hosting; official support | Cost; requires commercial agreement |

## Decision

For the **initial integration sprint** (SCRUM-160 through SCRUM-166) we target **a self-managed or partner-provided OTM instance** whose URL and credentials are supplied via environment variables (`OTM_BASE_URL`, `OTM_INSTANCE_NAME`, `OTM_API_USER`, `OTM_API_KEY`).

The instance identity is **not baked into the code**. The integration layer is fully instance-agnostic: any valid OTM instance URL + credentials will work without code changes.

This allows us to:
- Develop and test against a sandbox/demo instance immediately.
- Switch to a production instance (public, self-hosted, or subscription) by updating env vars alone.

## Consequences

- Credentials must **never be committed to source control**. They live exclusively in `.env` files and secrets managers. The `.env.example` documents the required variables with empty values.
- HMAC signing is implemented as a shared utility (`server/src/otm/hmac.js`) so all API calls go through a single authentication path.
- A health-check endpoint (`GET /api/otm/health`) verifies connectivity on demand.
- The instance-selection decision should be revisited once a preferred long-term partner or hosting arrangement is confirmed.
