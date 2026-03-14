# Tree Tracker Node Backend

This server is the backend runtime that loads `server/.env`, initializes the database middleware, and optionally starts Expo for local development.

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

- Load `server/.env` via `server/bootstrap.js`, without overwriting already-set process env values.
- Parse env configuration via `server/src/config.js`.
- Run `await db.init(config.db)`.
- Start HTTP health endpoints (`/health`, `/db/health`).
- In development (`START_EXPO=true` and non-production), spawn `npx expo start` in `EXPO_PROJECT_PATH`.
- In local Docker development, unmatched HTTP routes are proxied to Expo so `http://localhost:4000/` behaves like the Expo dev entrypoint while `/health` and `/db/health` stay on the backend.
- In production or Plesk (`START_EXPO=false`), unmatched `GET`/`HEAD` routes can serve the exported Expo web build from `EXPO_WEB_DIST_PATH` so `https://your-site/` opens the Expo app instead of returning backend `404`.
- On `SIGINT`/`SIGTERM`, stop Expo child, stop HTTP server, then close DB pool.

## Plesk Deployment For Expo Web

Use Plesk to run the Node server from `server/`, and let that server publish the Expo web app at the site root.

### Option 1: Plesk Startup Only

Use this if Plesk can just start a Node app and you do not want a separate deploy script.

1. Copy `server/.env.example` to `server/.env` on the server and set the production values there.

2. In Plesk, configure the Node app to run from `server/` with startup file `bootstrap.js` or `app.js`.

3. Press deploy in Plesk. On startup, the backend will:

- install Expo dependencies in `TreeGuardiansExpo/` if `node_modules/` is missing
- run `npm run export:web`
- create the configured database if it is missing and `DB_ALLOW_CREATE_DATABASE=true`
- apply schema migrations

Then the backend will serve the generated `TreeGuardiansExpo/dist/` build from `/`.

### Option 2: Plesk Deploy Script

Use this if you want Plesk to prepare the build before the Node app starts.

1. Copy `server/.env.example` to `server/.env` on the server and set the production values there.

2. In Plesk, configure the Node app to run from `server/` with startup file `bootstrap.js` or `app.js`.

3. Set the deployment command to:

```bash
bash ./scripts/plesk-deploy.sh
```

4. Press deploy in Plesk. The deploy script will:

- install Expo dependencies in `TreeGuardiansExpo/`
- install backend dependencies in `server/`
- run `npm run export:web`

Then the backend startup will load `server/.env`, create the configured database if required, apply schema migrations, and serve the generated `TreeGuardiansExpo/dist/` build from `/`.

With that setup:

- `/` serves the Expo web app.
- Expo assets under `/_expo/*` are served directly.
- Backend endpoints like `/health` and `/db/health` still work from the same Node process.

If you want the backend to rebuild the Expo web bundle again on every startup instead of relying on the deploy script, set `EXPO_AUTO_PREPARE=true`.

## `.env` Usage

- Commit `server/.env.example`; do not commit `server/.env`.
- Keep a different untracked `server/.env` file in each environment, including Plesk and local Docker.
- Existing process env values take precedence over `server/.env`, so Plesk or Docker can still override individual settings when needed.
- Local Docker commands in `scripts/` now expect `server/.env` to exist before they start.

## How To Add A DB Endpoint

1. Add validation first in `server/src/db/validation.js` if needed.
2. Add endpoint function under the right table group in `server/src/db/index.js`.
3. Keep SQL in middleware only and use prepared statements (`?` placeholders).
4. For multi-table writes, implement via `transaction(async (tx) => ...)`.
5. Add or update tests in `server/test/`.

## Manual DB Test Bench API (Development)

By default, DB testbench routes are disabled.

Enable explicitly with `DB_TEST_BENCH_ENABLED=true` (never enabled automatically in production). For secure usage, set `DB_TEST_BENCH_TOKEN` and pass it either as:

- `Authorization: Bearer <token>`
- `x-testbench-token: <token>`

When enabled, the server exposes:

- `GET /db/testbench/endpoints` returns all callable middleware endpoints.
- `POST /db/testbench/invoke` executes any endpoint by name.

`POST /db/testbench/invoke` requires `Content-Type: application/json` and body format:

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

Build the production server image:

```bash
docker build -t tree-tracker-server -f server/Dockerfile --target production .
```

Run the local development stack with MySQL and the Android emulator via Compose:

```bash
docker compose -f docker-compose.server.yml up --build server android-emulator
```

The `server` service runs the Node backend and launches Expo from the mounted `TreeGuardiansExpo/` project. The `android-emulator` service installs the Android SDK, creates an emulator, exposes VNC on `localhost:5900`, and exposes noVNC on `http://localhost:6080/vnc.html`. Inside the emulator, both `localhost:4000` and `localhost:8081` are wired back to the server container through `adb reverse`.

Before running Docker locally, copy `server/.env.example` to `server/.env` and keep Docker-specific values there.

For the normal local development workflow, run:

```bash
./scripts/start_local_server.sh
```

That starts the full development stack in the foreground. The server container watches backend files, Expo reloads frontend changes, the Android container opens Expo inside the emulator automatically, and the script tears everything down when you press `Ctrl+C`. Runtime logs are mirrored into the repository `logs/` directory for each container.

Run backend lock checks and tests inside containers (unit + integration):

```bash
docker compose -f docker-compose.server.yml --profile test up --build --abort-on-container-exit --exit-code-from server-test server-test
```
