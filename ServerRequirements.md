## Goal

Define backend-only requirements for a **Node.js server** that:

1. boots a **database middleware layer** (that owns all DB access, performs DB bootstrapping, and prevents raw SQL usage), and
2. starts the **Expo app** for local development.

This document treats your “database middleware” as a **code module inside the server runtime** (not a separate OS-level service), but it is isolated as its own layer with strict rules.

---

## Terms and definitions (used throughout)

* **Server (Node.js server):** The backend runtime process responsible for starting everything (DB middleware, API routes if any, dev tooling, Expo start).
* **Database (MySQL/MariaDB):** The relational datastore defined by your SQL schema.
* **Database middleware:** A dedicated backend module that:

  * boots/initializes the database (check/create/connect),
  * exposes **database endpoints** (functions) as the only allowed way to access data,
  * blocks any direct SQL execution by developers outside the middleware.
* **Database endpoint:** A typed function exposed by the middleware that performs a specific DB operation (CRUD or higher-level workflow). Example: `users.create(...)`, `trees.findNear(...)`, `commentsTree.createForTree(...)`.
* **CRUD:** Create, Read, Update, Delete operations.
* **Prepared statement:** A parameterized SQL command (`?` placeholders) used to prevent SQL injection and ensure safe execution.
* **Connection pool:** A managed set of DB connections reused across requests (better performance and stability than opening a new connection per query).
* **Transaction:** A set of SQL operations that either all succeed or all fail (atomic). Required for multi-step writes spanning multiple tables.
* **Schema bootstrapping:** Ensuring the database exists and required tables/indexes/constraints exist, applying schema if missing.
* **Access lock (your “lock on the database”):** A technical restriction that prevents “raw SQL from anywhere” and forces all SQL through the middleware.
* **Row:** A single record in a table.
* **Field/column:** A single attribute in a table row.

---

## Overall architecture

### High-level components

1. **Bootstrap Server (Node.js)**

* Entry point (e.g. `server/index.ts` or `server/src/main.ts`).
* Loads configuration (env vars).
* Starts the database middleware (boot sequence).
* Starts backend HTTP server (optional but typical; even if you only need middleware, you usually want a health endpoint).
* Starts Expo (dev mode) as a child process.

2. **Database Middleware Layer**

* Owns the **only MySQL driver instance** (pool).
* Implements schema bootstrapping.
* Exposes **database endpoints** grouped by table and by “complex workflows”.
* Enforces the “no raw SQL outside middleware” rule.

3. **API Layer (optional but recommended)**

* Express/Fastify routes call middleware endpoints.
* No SQL allowed here.
* Can be omitted if your “server” is only orchestrating middleware + Expo, but most teams add at least:

  * `/health`
  * `/db/health`

4. **Expo Dev Runner**

* The Node server starts Expo (e.g. `npx expo start`) and streams logs.
* In production, this is disabled.

### Layering rule (hard requirement)

* **Only** the database middleware may import the MySQL client library (`mysql2`, `mysql`, etc.).
* No other module may access a DB connection, pool, query method, or raw SQL string.

---

## Boot sequence requirements

### Server boot sequence

1. Load config:

* `NODE_ENV`, `PORT`
* DB config: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
* Schema file path or schema string embedded in code (recommended: schema file)
* `START_EXPO=true|false`
* `EXPO_PROJECT_PATH` (path to Expo app root)

2. Start database middleware:

* `await db.init()` must complete before server reports “ready”.
* If DB init fails, server exits with non-zero code (in dev you can optionally retry).

3. Start backend HTTP server (if used):

* exposes readiness only after `db.init()` succeeded.

4. Start Expo app (dev only):

* spawn `npx expo start` (or `expo start`) in the Expo project directory
* pipe stdout/stderr to server logs
* handle termination (SIGINT/SIGTERM): stop Expo child and close DB pool gracefully.

### Database middleware boot sequence (`db.init()`)

On boot it must:

1. **Connect to MySQL server (without assuming DB exists)**

* Connect using host/user/pass.
* If the target database does not exist, create it.

2. **Select database and validate schema**

* Check whether required tables exist.
* If missing, apply the schema (execute the provided SQL schema in the correct order).
* Optionally verify table columns/indexes/constraints match expected definitions.

3. **Create connection pool**

* Use a pool for runtime queries.
* Provide `db.close()` to drain pool on shutdown.

4. **Expose “ready” state**

* Middleware must refuse endpoint calls until initialized.

---

## “Database lock” requirement (prevent direct SQL)

You want a “lock” that disallows developers from running SQL directly. In Node, you can’t literally prevent someone from writing SQL unless you enforce it structurally. Requirements should combine **technical controls + conventions + CI enforcement**:

### Hard technical restrictions (required)

1. **Single ownership of DB client**

* Only the middleware package can depend on the MySQL driver.
* Server/app code must not import it.

2. **No raw query export**

* Middleware must not export the underlying pool/connection.
* Middleware must not export a generic “query(sql)” method to application code.

3. **Endpoint-only public surface**

* Middleware exports only named database endpoints (functions) and `init/close/health`.

### Enforced via tooling (required)

4. **Lint rule / CI check**

* Add an ESLint rule (or custom lint script) that blocks:

  * importing `mysql`, `mysql2`, `knex`, `sequelize`, etc. outside `/db-middleware/**`
  * string patterns like `.query(` outside middleware
* CI must fail if violated.

5. **Repository structure**

* Place middleware in a clear folder (e.g. `server/src/db/**` or a workspace package `packages/db-middleware/**`).
* Keep SQL files only inside middleware.

---

## Data access requirements

### Query safety

* All SQL must use **prepared statements** (parameter binding).
* No string concatenation for user-controlled values.
* Validate and whitelist all dynamic identifiers (table/column names) if you implement “generic CRUD for any field in any table”.

### Transactions

Middleware must support:

* `db.transaction(async (tx) => { ... })`
* Transaction context must be internal; callers should use endpoint functions that accept an optional transaction handle.

### Error handling contract

Endpoints must return:

* Success result (object) OR throw typed errors:

  * `NotFoundError`
  * `ValidationError`
  * `ConflictError` (e.g. unique constraint)
  * `AuthError` (if you build auth endpoints)
  * `DbError` (wrapped unknown DB errors)

### Logging/observability

* Middleware logs:

  * init steps
  * schema applied 여부
  * slow queries (threshold config)
* Never log passwords or session tokens in plaintext.

---

## Endpoint design requirements

You asked for:

* CRUD endpoints for **every table**, and also
* additional endpoints for complex operations.

Because your schema includes junction tables and subtype tables, the middleware should provide both:

1. **Table-level CRUD endpoints** (direct mapping), and
2. **Workflow endpoints** (safe multi-table operations that real features will need).

### Naming and grouping

* Export endpoints grouped by table name:

  * `users.*`, `userPasswords.*`, `admins.*`, `userSessions.*`, `trees.*`, etc.
* Plus a `workflows.*` group for complex operations.

### Generic CRUD vs explicit CRUD

You explicitly want: “creating, updating, getting and removing any field and/or row in every table”.
To satisfy this without allowing arbitrary SQL, requirements should include:

1. **Explicit endpoints per table** (preferred, safer)
2. **Optional generic endpoints** with strict whitelisting:

   * `generic.getRow(table, idOrKey)`
   * `generic.updateFields(table, key, fields)`
   * `generic.deleteRow(table, key)`
   * This requires a schema metadata map inside middleware: allowed tables, primary keys, allowed columns, writable columns.

Given you’d rather have “too many endpoints”, below is an explicit list per table + additional workflows.

---

## Required database endpoints (based on your schema)

Below, “filter” means server-side filtering via safe, parameterized conditions you support (not raw SQL). For complex queries, define explicit functions.

### 1) `users` table

* `users.create({ username, email?, phone? }) -> { id, ... }`
* `users.getById(id)`
* `users.getByUsername(username)`
* `users.list({ limit, offset })`
* `users.updateById(id, { username?, email?, phone? })`
* `users.deleteById(id)`
* `users.existsById(id) -> boolean`
* `users.existsByUsername(username) -> boolean`

### 2) `user_passwords`

* `userPasswords.setForUser(userId, passwordHash)` (insert/update)
* `userPasswords.getHashByUserId(userId)`
* `userPasswords.deleteForUser(userId)`
* `userPasswords.existsForUser(userId)`

### 3) `admins`

* `admins.grant(userId)`
* `admins.revoke(userId)`
* `admins.isAdmin(userId) -> boolean`
* `admins.list({ limit, offset })`

### 4) `user_sessions`

* `userSessions.create({ userId, sessionToken, expiresAt }) -> { id, ... }`
* `userSessions.getById(id)`
* `userSessions.getByToken(sessionToken)`
* `userSessions.listByUserId(userId, { includeExpired? })`
* `userSessions.extendByToken(sessionToken, newExpiresAt)`
* `userSessions.deleteById(id)`
* `userSessions.deleteByToken(sessionToken)`
* `userSessions.deleteAllForUser(userId)`
* `userSessions.deleteExpired(now = new Date()) -> count`

### 5) `trees`

* `trees.create({ latitude, longitude }) -> { id, ... }`
* `trees.getById(id)`
* `trees.list({ limit, offset })`
* `trees.updateById(id, { latitude?, longitude? })`
* `trees.deleteById(id)`
* `trees.findByBoundingBox({ latMin, latMax, lonMin, lonMax, limit, offset })`
* `trees.findNear({ latitude, longitude, radiusMeters, limit })`
  (implementation can start as bounding box approximation; requirement is endpoint exists)
* `trees.count()`

### 6) `tree_creation_data`

* `treeCreationData.create({ treeId, creatorUserId?, createdAt? })`
* `treeCreationData.getById(id)`
* `treeCreationData.getByTreeId(treeId)` (most common)
* `treeCreationData.list({ limit, offset })`
* `treeCreationData.updateById(id, { creatorUserId?, createdAt? })`
* `treeCreationData.deleteById(id)`
* `treeCreationData.deleteByTreeId(treeId)`

### 7) `tree_data`

* `treeData.create({ treeId, avoidedRunoff?, carbonDioxideStored?, ... })`
* `treeData.getById(id)`
* `treeData.getByTreeId(treeId)`
* `treeData.updateByTreeId(treeId, { avoidedRunoff?, carbonDioxideStored?, ... })`
* `treeData.deleteByTreeId(treeId)`
* `treeData.list({ limit, offset })`

### 8) `guardians` (junction: user_id, tree_id)

* `guardians.add({ userId, treeId })`
* `guardians.remove({ userId, treeId })`
* `guardians.exists({ userId, treeId })`
* `guardians.listByUser(userId, { limit, offset })` (returns treeIds)
* `guardians.listByTree(treeId, { limit, offset })` (returns userIds)
* `guardians.countByUser(userId)`
* `guardians.countByTree(treeId)`

### 9) `photos`

* `photos.create({ imageUrl, mimeType?, byteSize?, sha256?, createdAt? }) -> { id, ... }`
* `photos.getById(id)`
* `photos.getBySha256(sha256)`
* `photos.list({ limit, offset })`
* `photos.updateById(id, { imageUrl?, mimeType?, byteSize?, sha256? })`
* `photos.deleteById(id)`
* `photos.existsById(id)`

### 10) `tree_photos` (junction: tree_id, photo_id)

* `treePhotos.add({ treeId, photoId })`
* `treePhotos.remove({ treeId, photoId })`
* `treePhotos.exists({ treeId, photoId })`
* `treePhotos.listPhotoIdsByTree(treeId, { limit, offset })`
* `treePhotos.listTreeIdsByPhoto(photoId, { limit, offset })`
* `treePhotos.deleteAllForTree(treeId)`
* `treePhotos.deleteAllForPhoto(photoId)`

### 11) `comments`

Note: `comments` has `user_id` nullable and a created timestamp.

* `comments.create({ userId? , createdAt? }) -> { id, ... }`
* `comments.getById(id)`
* `comments.list({ limit, offset })`
* `comments.listByUserId(userId, { limit, offset })`
* `comments.updateUserById(id, userIdOrNull)` (rare but allowed)
* `comments.deleteById(id)`

### 12) `comment_photos` (junction: comment_id, photo_id)

* `commentPhotos.add({ commentId, photoId })`
* `commentPhotos.remove({ commentId, photoId })`
* `commentPhotos.exists({ commentId, photoId })`
* `commentPhotos.listPhotoIdsByComment(commentId, { limit, offset })`
* `commentPhotos.listCommentIdsByPhoto(photoId, { limit, offset })`
* `commentPhotos.deleteAllForComment(commentId)`
* `commentPhotos.deleteAllForPhoto(photoId)`

### 13) `comments_tree` (comment_id + tree_id + content)

This is effectively “a comment attached to a tree” and contains the content.

* `commentsTree.create({ commentId, treeId, content, createdAt? })`
* `commentsTree.get({ commentId, treeId })`
* `commentsTree.getByCommentId(commentId)`
* `commentsTree.listByTreeId(treeId, { limit, offset, order: 'asc'|'desc' })`
* `commentsTree.updateContent({ commentId, treeId, content })`
* `commentsTree.delete({ commentId, treeId })`
* `commentsTree.deleteByCommentId(commentId)`
* `commentsTree.deleteAllForTree(treeId)`

### 14) `comment_replies` (threading)

* `commentReplies.create({ commentId, parentCommentId, content, createdAt? })`
* `commentReplies.get({ commentId, parentCommentId })`
* `commentReplies.listByParent(parentCommentId, { limit, offset, order })`
* `commentReplies.listParentsOfComment(commentId, { limit, offset })` (reverse lookup)
* `commentReplies.updateContent({ commentId, parentCommentId, content })`
* `commentReplies.delete({ commentId, parentCommentId })`
* `commentReplies.deleteByCommentId(commentId)`
* `commentReplies.deleteAllForParent(parentCommentId)`

### 15) `wildlife_observations` (subtype of comment)

* `wildlifeObservations.create({ commentId, treeId, wildlife, wildlifeFound, observationNotes? })`
* `wildlifeObservations.getByCommentId(commentId)`
* `wildlifeObservations.listByTreeId(treeId, { limit, offset, order })`
* `wildlifeObservations.updateByCommentId(commentId, { wildlife?, wildlifeFound?, observationNotes? })`
* `wildlifeObservations.deleteByCommentId(commentId)`

### 16) `disease_observations`

* `diseaseObservations.create({ commentId, treeId, disease, evidence? })`
* `diseaseObservations.getByCommentId(commentId)`
* `diseaseObservations.listByTreeId(treeId, { limit, offset, order })`
* `diseaseObservations.updateByCommentId(commentId, { disease?, evidence? })`
* `diseaseObservations.deleteByCommentId(commentId)`

### 17) `seen_observations`

* `seenObservations.create({ commentId, treeId, observationNotes? })`
* `seenObservations.getByCommentId(commentId)`
* `seenObservations.listByTreeId(treeId, { limit, offset, order })`
* `seenObservations.updateByCommentId(commentId, { observationNotes? })`
* `seenObservations.deleteByCommentId(commentId)`

---

## Required workflow endpoints (multi-table, future-proof)

These are the ones that stop your app code from having to orchestrate complex multi-step DB operations.

### Auth workflows

* `workflows.auth.registerUser({ username, passwordHash, email?, phone? }) -> { userId }`

  * transaction: insert `users`, then insert `user_passwords`
* `workflows.auth.createSession({ userId, sessionToken, expiresAt }) -> { sessionId }`
* `workflows.auth.validateSession({ sessionToken, now }) -> { valid, userId? }`
* `workflows.auth.logout({ sessionToken })`

### Tree creation workflows

* `workflows.trees.createTreeWithMeta({ latitude, longitude, creatorUserId? }) -> { treeId }`

  * transaction: insert `trees`, insert `tree_creation_data`
* `workflows.trees.setTreeData({ treeId, treeDataFields })`

  * ensures `tree_data` row exists; upsert by `tree_id`

### Media attachment workflows

* `workflows.photos.addPhotoAndAttachToTree({ treeId, photo: { imageUrl, mimeType?, byteSize?, sha256? } }) -> { photoId }`

  * transaction: insert `photos` (or reuse by sha256), insert `tree_photos`
* `workflows.photos.addPhotoAndAttachToComment({ commentId, photo: {...} }) -> { photoId }`

### Comment workflows

Because comments are split across base + subtype + attachments:

* `workflows.comments.addTreeComment({ treeId, userId?, content, photoIds? }) -> { commentId }`

  * transaction:

    * insert `comments`
    * insert `comments_tree`
    * optionally insert `comment_photos` rows
* `workflows.comments.replyToComment({ parentCommentId, userId?, content, photoIds? }) -> { commentId }`

  * transaction:

    * insert `comments`
    * insert `comment_replies`
    * optionally attach photos

### Observation workflows (subtype creation)

Each observation subtype is a `comments` row + subtype row (+ optional photos):

* `workflows.observations.addWildlifeObservation({ treeId, userId?, wildlife, wildlifeFound, observationNotes?, photoIds? }) -> { commentId }`
* `workflows.observations.addDiseaseObservation({ treeId, userId?, disease, evidence?, photoIds? }) -> { commentId }`
* `workflows.observations.addSeenObservation({ treeId, userId?, observationNotes?, photoIds? }) -> { commentId }`

### Aggregation/query workflows (useful for screens)

* `workflows.trees.getTreeDetails(treeId) -> { tree, creationData?, treeData?, photoIds[], guardiansUserIds[] }`
* `workflows.trees.getTreeFeed(treeId, { limit, offset }) -> unified list`

  * merges:

    * `comments_tree`
    * observation subtype tables
    * replies (optionally nested)
* `workflows.users.getUserProfile(userId) -> { user, isAdmin, guardianTreeIds[] }`

---

## Validation requirements (schema-derived)

Middleware must validate inputs before hitting DB:

* `latitude` ∈ [-90, 90], `longitude` ∈ [-180, 180]
* `username` non-empty, <= 100 chars
* `email` <= 255 chars (optional format validation)
* `phone` <= 50 chars
* `session_token` exactly 64 chars (hex recommended)
* `sha256` exactly 64 chars when provided
* numeric fields (tree_data metrics) must be numbers and within sane ranges (define “accept any DECIMAL range” as baseline; optionally add domain checks later)

---

## Security requirements (backend)

* Use prepared statements everywhere.
* Passwords:

  * middleware never stores plaintext passwords
  * only `password_hash` stored (hash generated outside or via a dedicated auth module; middleware just persists)
* Sessions:

  * token must be cryptographically random (server layer responsibility)
  * `expires_at` enforced in `validateSession`
* Least privilege DB user (recommended requirement):

  * separate user for dev/prod
  * only needed permissions (CREATE DATABASE only if you truly want auto-create in that env; otherwise gate it behind config)

---

## Startup requirement: “server should also start the Expo app”

* In `NODE_ENV=development` (or `START_EXPO=true`):

  * server spawns Expo in `EXPO_PROJECT_PATH`
  * server does not treat Expo exit as fatal unless configured
* In production:

  * Expo is never started

---

## Deliverable requirements (what must exist in the repo)

1. A Node server entrypoint that:

* starts DB middleware (`init`)
* optionally starts HTTP server
* starts Expo in dev

2. A database middleware package/module that includes:

* `init()`, `close()`, `health()`
* all endpoints listed above (table groups + workflows)
* transaction support

3. CI enforcement:

* lint rule preventing raw DB driver imports / `.query` outside middleware

4. Documentation:

* A README section that states:

  * “All DB access must go through database endpoints”
  * list of endpoint groups
  * how to add a new endpoint (pattern + tests)