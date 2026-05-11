# Backend

The backend loads environment values, initializes MySQL, exposes `/api/*`, stores uploads, and optionally serves or prepares the Expo web export.

## Run

```bash
npm install
npm start
```

Tests:

```bash
npm test
npm run test:integration
```

`test:integration` requires a reachable MySQL server and `RUN_DB_TESTS=true`.

## Boot Flow

1. `server/bootstrap.js` loads `server/.env` without overwriting existing process env values.
2. `server/src/config.js` validates runtime config.
3. `server/src/main.js` prepares Expo web output when enabled, initializes DB, seeds dev users when enabled, and starts HTTP.
4. `server/src/http.js` mounts health routes, optional DB testbench routes, `/api`, `/uploads`, Expo proxying, and static web fallback.
5. `SIGINT` and `SIGTERM` stop Expo, HTTP, and DB in order.

## HTTP Routes

All API routes are mounted under `/api`.

| Route | Method | Auth | Effect |
| --- | --- | --- | --- |
| `/health` | `GET` | no | Returns process health. |
| `/db/health` | `GET` | no | Returns DB readiness. |
| `/api/` | `GET` | no | Returns API version text. |
| `/api/auth/register`, `/api/register` | `POST` | no | Creates user, password, session, and optional email verification token. |
| `/api/auth/login`, `/api/login` | `POST` | no | Creates access and refresh tokens. |
| `/api/auth/logout`, `/api/logout` | `POST` | refresh token body | Deletes a refresh token. |
| `/api/auth/verify-email` | `GET` | token query | Marks email verified. |
| `/api/auth/resend-verification` | `POST` | bearer token | Sends a new verification email. |
| `/api/auth/forgot-password` | `POST` | no | Sends a password reset link when the email exists. |
| `/api/auth/reset-password` | `POST` | action token body | Replaces the password hash. |
| `/api/users/me`, `/api/me` | `GET` | bearer token | Returns the current user. |
| `/api/account/username` | `PUT` | bearer token | Updates username. |
| `/api/account/email` | `PUT` | bearer token | Updates email and revokes verification. |
| `/api/account/password` | `PUT` | bearer token | Changes password after current-password check. |
| `/api/account/delete` | `DELETE` | bearer token | Deletes the current account after password check. |
| `/api/trees`, `/api/add-tree-data` | `POST` | verified bearer token | Adds a tree inside the Charlton Kings boundary. |
| `/api/trees`, `/api/get-trees` | `GET` | no | Lists trees with latest data, observations, photos, creator, and guardians. |
| `/api/trees/recent` | `GET` | no | Lists recent tree creations. |
| `/api/trees/:treeId`, `/api/get-tree-details` | `GET` | no | Returns one tree and its latest data row. |
| `/api/trees/:treeId` | `PATCH` | bearer token | Updates tree data and optional notes. |
| `/api/trees/:treeId` | `DELETE` | admin bearer token | Deletes a tree. |
| `/api/trees/:treeId/photos`, `/api/upload-photos` | `POST` | bearer token | Uploads or attaches tree photos. |
| `/api/trees/:treeId/photos/:photoId` | `DELETE` | admin bearer token | Removes a tree photo link and deletes orphaned photo rows/files. |
| `/api/trees/:treeId/comment-photos` | `POST` | bearer token | Uploads draft photos for comments. |
| `/api/trees/:treeId/comments` | `POST` | bearer token | Adds a text and/or photo comment. |
| `/api/trees/:treeId/comment-replies` | `POST` | bearer token | Adds a reply using `parentCommentId` in JSON. |
| `/api/trees/:treeId/comments/:parentCommentId/replies` | `POST` | bearer token | Adds a reply using the nested route. |
| `/api/trees/:treeId/feed` | `GET` | no | Lists comments, replies, wildlife, disease, and seen observations. |
| `/api/comments/recent` | `GET` | no | Lists recent tree comments. |
| `/api/comments/:commentId` | `DELETE` | admin bearer token | Deletes a tree comment or reply. |
| `/api/admin/users` | `GET` | admin bearer token | Lists users with roles and guardian tree IDs. |
| `/api/admin/users/:userId/role` | `PATCH` | admin bearer token | Sets `registered_user`, `guardian`, or `admin`. |
| `/api/admin/users/:userId/guardian-trees` | `POST` | admin bearer token | Assigns a guardian to a tree. |
| `/api/admin/users/:userId/guardian-trees/:treeId` | `DELETE` | admin bearer token | Removes guardian assignment. |
| `/api/admin/users/:userId/activity` | `GET` | admin bearer token | Returns recent comments and created trees. |
| `/api/admin/users/:userId` | `DELETE` | admin bearer token | Deletes another user. |
| `/api/analytics` | `GET` | admin bearer token | Returns tree, user, and impact totals. |
| `/api/analytics/activity` | `GET` | admin bearer token | Returns daily tree/comment/user/login counts for 1 to 90 days. |
| `/api/analytics/users` | `GET` | admin bearer token | Returns role counts and top contributors. |

JSON requests must use `Content-Type: application/json` or a JSON-compatible media type. JSON bodies are limited to 1 MB. Uploads accept JPEG, PNG, WEBP, and GIF files up to 10 MB each, with at most 12 files per request.

## Common Requests

Authenticated routes expect:

```http
Authorization: Bearer <accessToken>
```

Create a tree with a verified account:

```json
{
  "latitude": 51.8865,
  "longitude": -2.0475,
  "species": "English Oak",
  "health": "good",
  "notes": "Recently planted.",
  "wildlifeList": ["birds"],
  "diseaseList": []
}
```

`POST /api/trees` requires coordinates inside the Charlton Kings boundary and returns `{ "success": true, "tree_id": 123 }`.

Attach photos to a tree with multipart field `photos`.

Add a comment after uploading draft comment photos:

```json
{
  "content": "Canopy looks healthy.",
  "photoIds": [12, 13]
}
```

`POST /api/trees/:treeId/comments` requires non-empty `content`, at least one `photoIds` entry, or both.

## Error Shape

Errors return JSON:

```json
{ "error": "Message", "code": "ValidationError" }
```

`HTTP_VERBOSE_ERRORS=1` adds request, body, and cause-chain debug fields. Defaults are verbose in development and terse in production.

## Environment

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `NODE_ENV` | string | `development` | Selects production defaults and error verbosity. |
| `PORT` | integer | `4000` | HTTP listen port. |
| `JWT_SECRET` | string | required | Signs auth and action tokens. |
| `DB_HOST` | string | required | MySQL host. |
| `DB_PORT` | integer | `3306` | MySQL port. |
| `DB_USER` | string | required | MySQL user. |
| `DB_PASSWORD` | string | required | MySQL password. |
| `DB_DATABASE` | string | required | MySQL database name. |
| `DB_CONNECTION_LIMIT` | integer | `10` | MySQL pool size. |
| `DB_SLOW_QUERY_MS` | integer | `200` | Logs queries at or above this duration. |
| `DB_ALLOW_CREATE_DATABASE` | boolean | `true` | Creates the database during boot when missing. |
| `DB_SCHEMA_PATH` | path | `server/src/db/schema.sql` | SQL schema file used for snapshot migrations. |
| `FRONTEND_URL` | URL | none | Base URL for verification and reset email links. |
| `UPLOAD_PUBLIC_BASE_URL` | URL | request origin | Public base for uploaded file URLs. |
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` | `debug` in development, `info` in production | Minimum structured log level. |
| `HTTP_VERBOSE_ERRORS` | `0` or `1` | by `NODE_ENV` | Forces verbose or terse error JSON. |
| `SEED_DEV_USERS` | boolean | `false` | Creates or updates `admin` and `guardian` dev users. |
| `SEED_DEV_USERS_PASSWORD` | string | required when seeding | Password assigned to seeded dev users. |
| `START_EXPO` | boolean | `true` unless production | Starts `npx expo start` from the backend process. |
| `EXPO_PROJECT_PATH` | path | repo `TreeGuardiansExpo` | Expo project path. |
| `EXPO_DEV_SERVER_PORT` | integer | `8081` | Expo dev server port. |
| `EXPO_PROXY_ENABLED` | boolean | `START_EXPO` | Proxies unmatched backend routes to Expo. |
| `EXPO_STATIC_ENABLED` | boolean | `!START_EXPO` | Serves static Expo web output for unmatched `GET`/`HEAD` routes. |
| `EXPO_WEB_DIST_PATH` | path | `EXPO_PROJECT_PATH/dist` | Static web root. |
| `EXPO_AUTO_PREPARE` | boolean | `!START_EXPO` | Installs Expo dependencies if missing and runs `npm run export:web`. |
| `EXPO_DEVTOOLS_LISTEN_ADDRESS` | IP | `0.0.0.0` | Bind address passed to spawned Expo. |
| `EXPO_FATAL_ON_EXIT` | boolean | `false` | Marks backend process failed if spawned Expo exits non-zero. |
| `DB_TEST_BENCH_ENABLED` | boolean | `false`; forced `false` in production | Enables DB endpoint invocation routes. |
| `DB_TEST_BENCH_TOKEN` | string | none | Required token when the DB testbench is enabled. |
| `SMTP_HOST` | string | none | SMTP host for outbound email. |
| `SMTP_PORT` | integer | none | SMTP port. |
| `SMTP_USER` | string | none | SMTP username. |
| `SMTP_PASS` | string | none | SMTP password. |
| `SMTP_FROM` | email | none | Sender address. |

## DB Middleware

Application code should use `server/src/db/index.js`, not raw MySQL clients.

`server/src/db/runtime-lock.js` blocks `mysql2` client factories outside `server/src/db/**` and blocks `query`/`execute` unless called inside DB middleware access context. Violations throw `DB_LOCK_VIOLATION`.

Exported groups:

- Account: `users`, `userPasswords`, `admins`, `guardianUsers`, `userSessions`, `emailVerificationTokens`.
- Trees: `trees`, `treeCreationData`, `treeData`, `guardians`.
- Content: `photos`, `treePhotos`, `comments`, `commentPhotos`, `commentsTree`, `commentReplies`, `wildlifeObservations`, `diseaseObservations`, `seenObservations`.
- Workflows: `workflows.auth`, `workflows.trees`, `workflows.photos`, `workflows.comments`, `workflows.observations`, `workflows.users`, `workflows.analytics`.
- Debug: `debug.listTables`, `debug.countRows`, `debug.listRows`, `debug.previewAll`.

All public DB methods validate inputs and throw `ValidationError`, `NotFoundError`, `ConflictError`, `AuthError`, or `DbError` where applicable.

## DB Testbench

Enable only in development:

```env
DB_TEST_BENCH_ENABLED=true
DB_TEST_BENCH_TOKEN=strong-local-token
```

Authenticate with `Authorization: Bearer <token>` or `x-testbench-token: <token>`.

- `GET /db/testbench/endpoints` lists callable DB endpoints.
- `POST /db/testbench/invoke` calls an endpoint with JSON body:

```json
{
  "endpoint": "users.list",
  "args": [{ "limit": 10, "offset": 0 }]
}
```
