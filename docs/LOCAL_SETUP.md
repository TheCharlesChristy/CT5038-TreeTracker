# Local Setup and Stack Internals

This document explains, in technical detail, how the local development stack works for `CT5038-TreeTracker`, where every moving part lives, and how to operate and debug it.

## 1. Purpose and Scope

The local stack is designed to provide a one-command environment that approximates production shape while preserving a fast development loop.

It orchestrates:

- MySQL for local data persistence.
- The Node backend (`server/`) running via the root entry point (`app.js`).
- A continuously rebuilt Expo web export (`TreeGuardiansExpo/dist`) used by the backend as static assets.
- A live Expo dev server for Expo Go workflows.
- An Android emulator with noVNC for browser-accessible Android UI and auto-launch into Expo Go.

Canonical command:

```bash
./scripts/local_plesk_stack.sh
```

Quiet mode (reduced terminal noise, full logs still captured):

```bash
./scripts/local_plesk_stack.sh -q
```

## 2. Canonical Resource Map

### 2.1 Orchestration and Launcher

- Canonical compose file: `docker/compose.local.yml`
- Canonical launcher script: `scripts/local_plesk_stack.sh`
- Local env defaults template: `.env.docker.example`
- Active local env file: `.env.docker`

### 2.2 Docker Assets

- Dockerfiles:
  - `docker/images/server.Dockerfile`
  - `docker/images/expo.Dockerfile`
  - `docker/images/android-emulator.Dockerfile`
- Runtime helper scripts:
  - `docker/scripts/watch-expo-web.sh`
  - `docker/scripts/android-emulator-entrypoint.sh`

### 2.3 Compatibility Path (Non-Canonical)

- Compatibility compose file: `docker-compose.plesk-local.yml`

This file exists as a fallback compatibility path. The canonical path is `docker/compose.local.yml` via `scripts/local_plesk_stack.sh`.

### 2.4 App Components

- Root backend entry point: `app.js`
- Backend app: `server/`
- Backend DB schema: `server/src/db/schema.sql`
- Expo app source: `TreeGuardiansExpo/`
- Expo web output: `TreeGuardiansExpo/dist/`

### 2.5 Logs

- Host log directory: `logs/`
- Common log files:
  - `logs/mysql.log`
  - `logs/server.log`
  - `logs/expo.log`
  - `logs/expo-web-build.log`
  - `logs/android-emulator.log`

## 3. Prerequisites

### 3.1 Host Requirements

- Linux host with Docker Engine and Docker Compose plugin.
- Hardware virtualization enabled in BIOS/UEFI.
- KVM device available and accessible (`/dev/kvm`) for the emulator container.

The launcher hard-fails if `/dev/kvm` is absent.

### 3.2 First-Time Project Prereqs

- Ensure `.env.docker` exists. If missing, launcher copies `.env.docker.example`.
- Ensure `server/.env` exists. If missing and `server/.env.example` exists, launcher copies it.

## 4. Environment Configuration

Values are read from `.env.docker`.

Default template (`.env.docker.example`) defines:

- `MYSQL_ROOT_PASSWORD=root`
- `MYSQL_DATABASE=treetracker_dev`
- `SERVER_PORT=4000`
- `EXPO_DEV_SERVER_PORT=8081`
- `EXPO_HOST_MODE=tunnel` (recommended default for Expo Go)
- `WEB_BUILD_DEBOUNCE_SECONDS=2`

Important behavior:

- `EXPO_HOST_MODE=tunnel` is usually best for physical-device Expo Go.
- `EXPO_HOST_MODE=lan` can be used when device and host are on same reachable LAN.

## 5. What the Launcher Script Actually Does

Script: `scripts/local_plesk_stack.sh`

Execution sequence:

1. Resolve root paths and select canonical compose file (`docker/compose.local.yml`).
2. Parse script options (`-q/--quiet`, `-h/--help`) and pass-through compose args.
3. Create `logs/` and normalize log ownership/permissions if needed.
4. Validate `/dev/kvm` exists before startup.
5. Bootstrap missing env files (`.env.docker`, optionally `server/.env`).
6. Read and print startup URLs and mode:
   - web (`SERVER_PORT`)
   - expo (`EXPO_DEV_SERVER_PORT`)
   - noVNC (`6080`)
7. Start background per-service log streamers into `logs/*.log`.
8. Start background scanner that extracts first `exp://...` link from `logs/expo.log` and prints it.
9. Run compose `up` in fail-fast mode:
   - `--abort-on-container-failure` is enabled.
10. On exit (`EXIT`, `INT`, `TERM`), stop log streamers and run compose `down --remove-orphans`.

### 5.1 Quiet vs Normal Mode

Normal mode:

- `docker compose up --build --remove-orphans --abort-on-container-failure`
- Suppresses terminal attach for noisy services (`mysql`, `server`, `expo-web-build`) but still shows Expo/emulator output.

Quiet mode:

- Builds first with `docker compose build --quiet`.
- Runs `up --no-build` and no-attaches several services including emulator.
- Keeps terminal focused mainly on Expo while writing full logs to files.

## 6. Compose Architecture (`docker/compose.local.yml`)

Project name:

- `ct5038-treetracker-local`

Defined services:

1. `mysql`
2. `expo-web-build`
3. `server`
4. `expo`
5. `android-emulator`

Persistent volumes:

- `mysql_data`
- `server_node_modules`
- `expo_node_modules`

### 6.1 Service: `mysql`

Role:

- Database backend for local environment.

Key settings:

- Image: `mysql:8.0`
- Port mapping: `3306:3306`
- Volume: `mysql_data:/var/lib/mysql`
- Healthcheck gate used by dependent backend startup.

### 6.2 Service: `expo-web-build`

Role:

- Continuous source watcher that exports static web bundle into `TreeGuardiansExpo/dist`.

Key settings:

- Built from: `docker/images/expo.Dockerfile`
- Command: `/workspace/docker/scripts/watch-expo-web.sh`
- Uses mounted repo and persistent Expo node_modules volume.
- Writes watch/build activity to `logs/expo-web-build.log`.

Behavior details (`docker/scripts/watch-expo-web.sh`):

- Computes a content hash over selected Expo source file types.
- Ignores heavy/generated dirs (`node_modules`, `.expo`, `dist`, `android`, `ios`).
- On hash change:
  - Runs `npm install` for Expo app.
  - Runs `npm run export:web`.
- Sleeps with configurable debounce between checks.

### 6.3 Service: `server`

Role:

- Main backend runtime serving API and static web assets.

Key settings:

- Built from: `docker/images/server.Dockerfile`
- Command: `npm install --prefix /workspace/server && node --watch /workspace/app.js`
- Port mapping: `${SERVER_PORT:-4000}:4000`
- Depends on:
  - `mysql` healthy
  - `expo-web-build` started

Critical env wiring:

- DB points to `mysql` service network host.
- `EXPO_STATIC_ENABLED=true`
- `EXPO_WEB_DIST_PATH=/workspace/TreeGuardiansExpo/dist`
- This means backend serves static web export generated by `expo-web-build`.

### 6.4 Service: `expo`

Role:

- Live Expo dev server used by Expo Go clients.

Key settings:

- Built from: `docker/images/expo.Dockerfile`
- Command:

```bash
npm install && npx expo start --go --port ${EXPO_DEV_SERVER_PORT:-8081} --host ${EXPO_HOST_MODE:-tunnel} --clear
```

- Port mappings:
  - `8081` (default, configurable)
  - `19000`, `19001`, `19002`
- Has interactive terminal flags (`stdin_open`, `tty`) for Expo tooling behavior.

### 6.5 Service: `android-emulator`

Role:

- Containerized Android emulator plus noVNC endpoint.
- Auto-installs/opens Expo Go and proxies backend/Expo endpoints into emulator localhost.

Key settings:

- Built from: `docker/images/android-emulator.Dockerfile`
- Uses `/dev/kvm` passthrough for acceleration.
- Port mappings:
  - `6080` noVNC
  - `5900` VNC
- Depends on `expo` started.

Runtime details (`docker/scripts/android-emulator-entrypoint.sh`):

- Starts `Xvfb` display.
- Verifies KVM readability/writability.
- Boots Android emulator AVD (`expo-emulator`) with swiftshader software GPU mode.
- Starts `x11vnc` and noVNC websockify/proxy.
- Waits for ADB + full Android boot completion (`sys.boot_completed=1`).
- Creates `adb reverse`-backed TCP proxies for:
  - Backend (`server:4000` -> emulator localhost:4000)
  - Expo (`expo:8081` -> emulator localhost:8081)
- Resolves Expo target and launches `exp://127.0.0.1:8081` inside emulator.
- Logs to `logs/android-emulator.log`.

## 7. Docker Image Internals

### 7.1 `docker/images/server.Dockerfile`

- Base: `node:20-bookworm`
- Installs minimal runtime packages + `tini`.
- Uses `tini` entrypoint for cleaner signal handling.

### 7.2 `docker/images/expo.Dockerfile`

- Base: `node:20-bookworm`
- Installs `@expo/ngrok` globally.
- Needed for `expo start --host tunnel` flow without interactive install prompts.

### 7.3 `docker/images/android-emulator.Dockerfile`

- Base: `node:20-bookworm`
- Installs Android SDK commandline tools, emulator, platform tools, system image.
- Creates AVD (`expo-emulator`) at build time.
- Attempts Expo Go APK resolution/download for configured SDK major (`EXPO_SDK_VERSION=54`).
- Copies emulator entrypoint script and exposes emulator/VNC/noVNC ports.

## 8. Network and Data Flow

### 8.1 Backend + Web

- Browser hits `http://localhost:${SERVER_PORT}`.
- Backend process handles API routes and serves static files from `TreeGuardiansExpo/dist`.

### 8.2 Expo Go Path

- Expo service hosts dev bundle on `expo:8081` (inside compose network).
- Android emulator service reverse-proxies this to emulator localhost (`127.0.0.1:8081`).
- Emulator opens `exp://127.0.0.1:8081` via Expo Go.

### 8.3 Emulator UI Path

- noVNC endpoint at `http://localhost:6080/vnc.html` gives browser access to emulator display.

### 8.4 Database Path

- Backend uses compose DNS host `mysql` on `3306`.
- Data persists in named volume `mysql_data`.

## 9. Runtime Lifecycle and Failure Semantics

The launcher uses fail-fast compose behavior (`--abort-on-container-failure`):

- If a service exits non-zero, full stack is torn down.
- This is intentional for quick signal of orchestration breakage.

Implication:

- Emulator instability can stop entire stack, even if backend/Expo are otherwise healthy.

## 10. Logs and Observability

Primary host-side logs:

- `logs/mysql.log`
- `logs/server.log`
- `logs/expo.log`
- `logs/expo-web-build.log`
- `logs/android-emulator.log`

Launcher behavior:

- Starts per-service `docker compose logs -f` streamers writing to these files.
- Prints discovered Expo deep link (`exp://...`) when found in `logs/expo.log`.

Useful commands:

```bash
# Quick status
docker compose --env-file .env.docker -f docker/compose.local.yml ps

# Tail all logs
tail -n 200 logs/*.log

# Follow emulator log
tail -f logs/android-emulator.log
```

## 11. Typical Local Workflows

### 11.1 Start Stack

```bash
./scripts/local_plesk_stack.sh
```

### 11.2 Start in Quiet Mode

```bash
./scripts/local_plesk_stack.sh -q
```

### 11.3 Stop Stack

- Press `Ctrl+C` in launcher terminal.
- Cleanup trap runs compose down automatically.

Manual stop if needed:

```bash
docker compose --env-file .env.docker -f docker/compose.local.yml down --remove-orphans
```

### 11.4 Rebuild from Scratch

```bash
docker compose --env-file .env.docker -f docker/compose.local.yml build --no-cache
./scripts/local_plesk_stack.sh -q
```

## 12. Troubleshooting

### 12.1 `/dev/kvm` Missing or Inaccessible

Symptoms:

- Launcher exits early with KVM error.
- Emulator container exits immediately.

Checks:

```bash
ls -l /dev/kvm
```

Fixes:

- Enable virtualization in BIOS/UEFI.
- Ensure host user/docker runtime can access `/dev/kvm`.

### 12.2 Expo Link Not Printed

Symptoms:

- No `exp://` line appears.

Checks:

```bash
grep -Eo 'exp://[^[:space:]]+' logs/expo.log | head -n 1
```

If empty:

- Expo may still be booting.
- Expo service may have failed startup; inspect `logs/expo.log`.

### 12.3 Web UI Not Updating

Symptoms:

- Backend serves stale frontend.

Checks:

- `logs/expo-web-build.log` for watcher/build errors.
- Confirm `TreeGuardiansExpo/dist` is being updated.

### 12.4 Database Connectivity Issues

Checks:

- `mysql` healthcheck status in `docker compose ps`.
- `DB_*` values in `.env.docker` and compose environment.

### 12.5 Emulator Boots But Expo Go Does Not Open

Checks:

- `logs/android-emulator.log` for APK install/start warnings.
- Verify expo service reachable and port 8081 proxying established.

## 13. Relationship to Plesk/Production Shape

Production and local intentionally differ in tooling, but share structure where it matters:

- Backend entry point remains root-level (`app.js`).
- Static web bundle path is `TreeGuardiansExpo/dist`.
- Backend serves built web assets.

Reference production docs:

- `PLESK.md`
- `plesk_deploy.sh`

## 14. Quick Reference

### 14.1 Key URLs

- Web app: `http://localhost:${SERVER_PORT}` (default `4000`)
- Expo dev server endpoint: `http://localhost:${EXPO_DEV_SERVER_PORT}` (default `8081`)
- noVNC emulator: `http://localhost:6080/vnc.html`

### 14.2 Key Commands

```bash
# Canonical start
./scripts/local_plesk_stack.sh

# Quiet mode
./scripts/local_plesk_stack.sh -q

# Stop everything
docker compose --env-file .env.docker -f docker/compose.local.yml down --remove-orphans

# Show service state
docker compose --env-file .env.docker -f docker/compose.local.yml ps
```

### 14.3 Canonical Files to Check First When Debugging

- `scripts/local_plesk_stack.sh`
- `docker/compose.local.yml`
- `docker/scripts/android-emulator-entrypoint.sh`
- `docker/scripts/watch-expo-web.sh`
- `logs/*.log`
