# OpenTreeMap Integration

This document covers the changes made as part of the OTM integration (SCRUM-160 through SCRUM-166) and the steps needed to enable it in a new environment.

---

## Overview

The integration connects TreeGuardians to an [OpenTreeMap](https://www.opentreemap.org/) instance to:

- Show OTM community trees on the map alongside our own
- Submit newly added trees to OTM automatically (async, with retry)
- Display accurate iTree ecosystem benefit figures (CO₂, stormwater, air quality) sourced from OTM instead of internal estimates
- Offer a searchable species picker backed by the OTM species list

The integration is **opt-in**. If the four required environment variables are not set the feature is silently disabled everywhere — no errors, no broken pages.

---

## What Changed

### Backend (`server/`)

| File | What it does |
|---|---|
| `src/otm/config.js` | Loads OTM env vars; sets `enabled = false` when any required var is missing |
| `src/otm/hmac.js` | Signs every OTM request with HMAC-SHA256 (`ApiKey user:base64sig` header) |
| `src/otm/client.js` | HTTP client for OTM API — logs every call with status and duration, enforces a sliding-window rate limit |
| `src/otm/cache.js` | Simple TTL cache used to avoid hammering the OTM API |
| `src/otm/speciesMap.js` | Maps our 12 internal species labels to OTM USDA codes; "Other" → `null` triggers manual review |
| `src/otm/syncQueue.js` | In-process queue that submits trees to OTM after creation; retries with exponential backoff (5 s → 10 s → 20 s), max 3 attempts; trees with no USDA match are flagged for review |
| `src/routes/api/otm.js` | API routes: `/api/otm/health`, `/api/otm/trees`, `/api/otm/species`, `/api/otm/ecoservice`, `/api/otm/sync-status` |
| `src/routes/api/trees.js` | After a successful tree creation, enqueues an async OTM contribution; `otm_plot_id` is included in tree detail responses |
| `src/db/schema.sql` | Added `otm_plot_id` and `otm_sync_status` columns to `tree_data`; new `otm_species` cache table |
| `src/db/modules/trees.js` | Added `setOtmPlotId` and `setOtmSyncStatus` helpers |
| `.env.example` | Documents all OTM environment variables (see Setup below) |

### Frontend (`TreeGuardiansExpo/`)

| File | What it does |
|---|---|
| `lib/otmApi.ts` | `fetchOtmTreesInBbox`, `fetchOtmSpecies`, `fetchOtmEcoservice` — typed wrappers around the backend proxy routes |
| `objects/TreeDetails.ts` | Added `otmPlotId` field to `TreeDetails` and `Tree` |
| `lib/treeApi.ts` | `normalizeTree` now maps `otmPlotId` from the server response |
| `components/base/MapComponent.web.tsx` | Orange OTM marker layer on the Leaflet map; fetched by bounding box on `moveend`; popup shows species, diameter, condition, a link to OTM, and "Source: OpenTreeMap" attribution; toggle button (bottom-left) to show/hide |
| `components/base/TreeDataStats.tsx` | Eco stat cards now display OTM iTree figures when available, falling back to internal estimates; shows attribution text accordingly |
| `components/base/TreeDashboard.tsx` | Fetches ecoservice data on dashboard open when the tree has an `otmPlotId`; passes the result to `TreeDataStats` |
| `components/base/TreeSpeciesSelect.tsx` | Fetches OTM species list on mount; merges with internal list (internal entries take precedence); adds a search input filtering by common name and scientific name; falls back to the internal-only list if OTM is unavailable |

### Docs

| File | What it does |
|---|---|
| `docs/adr-001-otm-instance-selection.md` | Architecture Decision Record: OTM instance identity is configured purely via env vars, never baked into code |
| `docs/otm-integration.md` | This document |

---

## Setup

### 1. Apply the database migration

The schema changes need to be applied to any existing database. Run the two statements below (or re-run the full `schema.sql` on a fresh database):

```sql
ALTER TABLE tree_data
  ADD COLUMN otm_plot_id varchar(64) NULL,
  ADD COLUMN otm_sync_status enum('pending','synced','failed','needs_review') NULL;

CREATE TABLE IF NOT EXISTS otm_species (
  id INT AUTO_INCREMENT PRIMARY KEY,
  otm_id VARCHAR(64) NOT NULL UNIQUE,
  common_name VARCHAR(128),
  scientific_name VARCHAR(128),
  usda_symbol VARCHAR(32),
  itree_code VARCHAR(64),
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. Set environment variables

Add the following to `server/.env` (copy from `server/.env.example`):

```env
# Required — leave blank to disable OTM integration entirely
OTM_BASE_URL=https://app.opentreemap.org
OTM_INSTANCE_NAME=your-instance-slug
OTM_API_USER=your-api-username
OTM_API_KEY=your-hmac-secret-key

# Optional — defaults shown
OTM_REQUEST_TIMEOUT_MS=10000
OTM_CACHE_TTL_MS=300000        # 5 min — map bbox cache
OTM_SPECIES_CACHE_TTL_MS=604800000  # 7 days — species list cache
OTM_MAX_RETRIES=3
OTM_RATE_LIMIT_RPM=60
```

`OTM_BASE_URL`, `OTM_INSTANCE_NAME`, `OTM_API_USER`, and `OTM_API_KEY` are all required. If any one is missing, the integration is disabled.

### 3. Verify connectivity

Once the server is running, hit the health endpoint:

```
GET /api/otm/health
```

A healthy response looks like:

```json
{ "ok": true, "status": 200, "durationMs": 142 }
```

If OTM is not configured you will get:

```json
{ "ok": false, "reason": "not-configured" }
```

---

## How the async sync queue works

When a tree is created via the app, the server:

1. Saves the tree to the database and returns HTTP 201 to the client immediately.
2. In the background (`setImmediate`), looks up the species USDA code and calls the OTM API to create a Plot, then a Tree linked to it.
3. On success, stores the OTM `plot_id` in `tree_data.otm_plot_id` and sets `otm_sync_status = 'synced'`.
4. On failure, retries up to 3 times with exponential backoff (5 s, 10 s, 20 s). After all retries are exhausted the record is marked `failed`.
5. Trees with a species that has no USDA mapping (i.e. "Other") are marked `needs_review` immediately without retrying.

### Monitoring

Admins can check the queue state at any time (requires authentication):

```
GET /api/otm/sync-status
```

```json
{
  "enabled": true,
  "queued": 4,
  "pending": 1,
  "synced": 12,
  "failed": 0,
  "lastSyncedAt": "2026-04-29T20:14:00.000Z",
  "failedRecords": [],
  "rateLimit": {
    "requestsInLastMinute": 3,
    "limitRpm": 60
  }
}
```

> **Note:** The queue is in-memory. Pending items are lost on server restart. A future improvement would persist the queue to the database.

---

## Species mapping

The species translation table is in `server/src/otm/speciesMap.js`. It maps our 12 internal labels to OTM USDA codes. If you add a new species to the internal list you should add a corresponding entry here.

Trees with a species of "Other" (or any label with no USDA match) are not submitted to OTM and instead go into the `needs_review` bucket visible in `/api/otm/sync-status`.

---

## Frontend map

The OTM layer on the map is **only rendered in the web build** (`MapComponent.web.tsx`). It is not shown in the native mobile builds. The toggle button appears in the bottom-left corner of the map and is orange when active.
