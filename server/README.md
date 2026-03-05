# Tree Tracker Node Backend

This server is the backend runtime that initializes the database middleware and optionally starts Expo for local development.

The canonical server requirements are in `ServerRequirements.md` at the repository root.

## Database Lock Rules

- DB client creation is runtime-locked: direct `mysql2` client factories (`createPool`, `createConnection`) are blocked outside `server/src/db/**`.
- Second-layer runtime lock guards `query`/`execute` on created clients, so leaked client objects cannot run SQL from outside middleware.
- Application code outside `server/src/db/**` must use exported database endpoint groups from `server/src/db/index.js`.
- Direct SQL access attempts outside middleware throw `DB_LOCK_VIOLATION`.

### Endpoint Groups

- Table groups: `users`, `userPasswords`, `admins`, `userSessions`, `trees`, `treeCreationData`, `treeData`, `guardians`, `photos`, `treePhotos`, `comments`, `commentPhotos`, `commentsTree`, `commentReplies`, `wildlifeObservations`, `diseaseObservations`, `seenObservations`.
- Workflow groups: `workflows.auth`, `workflows.trees`, `workflows.photos`, `workflows.comments`, `workflows.observations`, `workflows.users`.

The lock is enforced in software by `server/src/db/runtime-lock.js`, and verified in CI by `server/scripts/enforce-db-lock.js` (`npm run db-lock:check`).

## Boot Flow

- Load env configuration via `server/src/config.js`.
- Run `await db.init(config.db)`.
- Start HTTP health endpoints (`/health`, `/db/health`).
- In development (`START_EXPO=true` and non-production), spawn `npx expo start` in `EXPO_PROJECT_PATH`.
- On `SIGINT`/`SIGTERM`, stop Expo child, stop HTTP server, then close DB pool.

## How To Add A DB Endpoint

1. Add validation first in `server/src/db/validation.js` if needed.
2. Add endpoint function under the right table group in `server/src/db/index.js`.
3. Keep SQL in middleware only and use prepared statements (`?` placeholders).
4. For multi-table writes, implement via `transaction(async (tx) => ...)`.
5. Add or update tests in `server/test/`.

## Manual DB Test Bench API (Development)

When `DB_TEST_BENCH_ENABLED=true` (enabled by default outside production), the server exposes routes for manual endpoint testing:

- `GET /db/testbench/endpoints` returns all callable middleware endpoints.
- `POST /db/testbench/invoke` executes any endpoint by name.

`POST /db/testbench/invoke` body format:

```json
{
	"endpoint": "users.list",
	"args": [{ "limit": 10, "offset": 0 }]
}
```

Read-only database inspection helpers are available under the `debug.*` endpoint group:

- `debug.listTables()`
- `debug.countRows(tableName)`
- `debug.listRows(tableName, { limit, offset, order })`
- `debug.previewAll({ limit, order })`

## Docker Usage

Build the server image:

```bash
docker build -t tree-tracker-server ./server
```

Run the server with MySQL via Compose:

```bash
docker compose -f docker-compose.server.yml up --build server
```

Run backend lock checks and tests inside containers (unit + integration):

```bash
docker compose -f docker-compose.server.yml --profile test up --build --abort-on-container-exit --exit-code-from server-test server-test
```
