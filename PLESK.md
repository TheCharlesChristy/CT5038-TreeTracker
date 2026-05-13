# Plesk Deployment

Plesk runs the root `app.js`, which loads `server/.env`, starts the Node backend, and serves the Expo web export when static serving is enabled.

## Runtime Shape

```text
/tree_guardians
├── app.js
├── server/
└── TreeGuardiansExpo/
    └── dist/
```

`server/src/config.js` defaults to production-safe web serving when `NODE_ENV=production` and `START_EXPO=false`: Expo is not spawned, `EXPO_STATIC_ENABLED` defaults to `true`, and `EXPO_AUTO_PREPARE` defaults to `true`.

## Plesk Node App

| Setting | Value |
| --- | --- |
| Application root | repository root |
| Startup file | `app.js` |
| Document root | `TreeGuardiansExpo/dist` if Plesk serves static files directly; otherwise repository root is enough for Node static serving |

The package manifests declare Node `20.20.1`. The current `plesk_deploy.sh` writes `.node-version` as `16` before installing backend dependencies, so the Plesk Node version must be checked after deployment.

## Environment

Create `server/.env` on the server from `server/.env.example`.

Minimum production values:

- `NODE_ENV=production`
- `PORT=<plesk-assigned-port-or-4000>`
- `JWT_SECRET=<strong-secret>`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `FRONTEND_URL=<public-site-origin>`
- `START_EXPO=false`
- `EXPO_STATIC_ENABLED=true`
- `EXPO_WEB_DIST_PATH=<absolute-path-to-TreeGuardiansExpo/dist>`

Email verification and password reset require `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`.

## Deploy Script

Plesk Git deployment can run:

```bash
bash plesk_deploy.sh
```

Current script behavior:

1. Writes `.node-version`.
2. Initializes `nodenv`.
3. Runs `npm install --omit=dev` in `server/`.
4. Creates `server/uploads`.
5. Touches `tmp/restart.txt`.

The script does not build Expo. With `EXPO_AUTO_PREPARE=true`, backend startup installs Expo dependencies if needed and runs `npm run export:web`.

## Checks

- `server/.env` exists and contains production DB and JWT values.
- `TreeGuardiansExpo/dist/index.html` exists after startup or deploy.
- `/health` returns `{ "status": "ok" }`.
- `/db/health` returns HTTP `200` with `ready: true`.
- Uploaded files can be written under `server/uploads`.

## Common Failures

`npm: command not found`: Plesk did not initialize `nodenv`; check the deploy script output.

Frontend 404: the Expo export is missing, `EXPO_WEB_DIST_PATH` is wrong, or Plesk document root points outside the app root.

Email links fail: `FRONTEND_URL` is missing or does not match the public site origin.

Database boot fails: required `DB_*` values are missing, the database user lacks access, or `DB_ALLOW_CREATE_DATABASE=false` while the database does not exist.
