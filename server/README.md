# Tree Tracker Node Backend

This server is the backend runtime that initializes the database middleware and optionally starts Expo for local development.

The canonical server requirements are in `ServerRequirements.md` at the repository root.

## Database Lock Rules

- Only `server/src/db/**` may import SQL client libraries (`mysql`, `mysql2`, `knex`, `sequelize`, etc.).
- Application code outside `server/src/db/**` must not execute raw SQL or call `.query(`.
- DB access must use exported database endpoint groups from `server/src/db/index.js`.

These rules are enforced by `server/scripts/enforce-db-lock.js` and CI (`npm run lint`).

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
