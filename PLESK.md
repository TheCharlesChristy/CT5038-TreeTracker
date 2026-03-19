# PLESK

## Overview

This project consists of two parts:

* **Backend (Node.js)** → `/server`
* **Frontend (Expo Web build)** → `/TreeGuardiansExpo/dist`

Plesk is configured to:

* Run the Node.js backend
* Serve the built Expo app as static files

---

## Directory Layout (Production)

```
/tree_guardians
├── app.js                  # Plesk entry point
├── server/                 # Backend
└── TreeGuardiansExpo/
    └── dist/               # Built frontend (served publicly)
```

---

## Plesk Configuration

### Node.js Settings

| Setting                  | Value                                    |
| ------------------------ | ---------------------------------------- |
| Application Root         | `/tree_guardians`                        |
| Application Startup File | `app.js`                                 |
| Document Root            | `/tree_guardians/TreeGuardiansExpo/dist` |

### Notes

* **Application Root must contain Document Root** (Plesk requirement)
* `app.js` should only start the backend (e.g. require `./server/server.js`)
* Static files are served directly from `/dist`

---

## Node Version (nodenv)

Plesk uses `nodenv`, so a local Node version must be defined.

### Set Node version

SSH into the server:

```bash
cd /tree_guardians
nodenv local 16.20.2
```

This creates:

```
.node-version
```

### Verify

```bash
nodenv version
node -v
```

---

## Git Deployment Setup

In Plesk:

* Enable **Git integration**
* Set deployment action to:

```bash
bash plesk_deploy.sh
```

---

## Deployment Script

Create `plesk_deploy.sh` in repo root:

```bash
#!/bin/bash
set -e

ROOT="$(pwd)"
SERVER_DIR="$ROOT/server"
EXPO_DIR="$ROOT/TreeGuardiansExpo"

# Initialise nodenv (required in Plesk)
export NODENV_ROOT="$HOME/.nodenv"
export PATH="$NODENV_ROOT/bin:$PATH"
eval "$(nodenv init -)"

echo "Node: $(node -v)"
echo "NPM: $(npm -v)"

echo "=== Installing backend ==="
cd "$SERVER_DIR"
npm install --omit=dev

echo "=== Installing frontend ==="
cd "$EXPO_DIR"
npm install

echo "=== Building Expo ==="
npx expo export --platform web

echo "=== Restarting app ==="
mkdir -p "$ROOT/tmp"
touch "$ROOT/tmp/restart.txt"

echo "=== Deployment complete ==="
```

Make executable:

```bash
chmod +x plesk_deploy.sh
```

---

## Environment Variables

* Configure environment variables via:

  * Plesk UI (preferred), or
  * `.env` files (if supported by your server code)

Ensure:

* Backend uses correct production values
* Frontend API URLs point to deployed backend

---

## Common Issues

### 1. `npm: command not found`

Cause:

* nodenv not initialized

Fix:

* Ensure script includes:

```bash
eval "$(nodenv init -)"
```

---

### 2. `nodenv: no local version configured`

Cause:

* Missing `.node-version`

Fix:

```bash
nodenv local 16.20.2
```

---

### 3. Expo build fails

Possible causes:

* Node version mismatch
* Missing dependencies

Fix:

* Ensure Node 16.20.x is used
* Run `npm install` locally and commit lockfiles if needed

---

### 4. 404 on frontend

Common causes:

* `dist/` not built
* wrong Document Root
* SPA routing not handled

Check:

* `/TreeGuardiansExpo/dist/index.html` exists
* correct Plesk Document Root

---

## Deployment Flow

1. Push to Git repository
2. Plesk pulls changes
3. `plesk_deploy.sh` runs:

   * installs dependencies
   * builds frontend
   * restarts backend
4. Site updates live

---

## Notes

* Avoid using `npm ci` unless lockfiles are committed
* Node version must match server capabilities (glibc constraints)
* Frontend is static; backend handles API only

---

## Local Docker Stack (Plesk Emulation + Mobile Testing)

This repository now includes a local Docker Compose setup that mirrors the same deployment shape as Plesk while still letting you test mobile flows.

### What It Runs

* `mysql`: MySQL 8 database
* `server`: Node backend serving API + static web from `TreeGuardiansExpo/dist`
* `expo-web-build`: watches Expo source and re-exports static web build into `dist`
* `expo`: Expo dev server for mobile testing (Expo Go)
* `android-emulator`: Android emulator exposed over noVNC

### Files Added

* `docker-compose.plesk-local.yml`
* `server/Dockerfile`
* `scripts/local_plesk_stack.sh`
* `.env.docker.example`

### First-Time Setup

```bash
cp .env.docker.example .env.docker
cp server/.env.example server/.env
```

Edit values in `.env.docker` if required (for example `EXPO_HOST_MODE=lan` if your phone can directly reach your host on local network).

### Start The Stack

```bash
./scripts/local_plesk_stack.sh
```

Stop with `Ctrl+C`. The script traps the signal and tears the whole stack down automatically.

### Access URLs

* Plesk-style backend + static web app: `http://localhost:4000/`
* Backend health: `http://localhost:4000/health`
* Expo dev server: `http://localhost:8081/`
* Android emulator via browser VNC: `http://localhost:6080/vnc.html`

### Live Updates / Mounted Code

* Source code is bind-mounted (`./:/workspace`) in containers.
* Backend restarts automatically on edits with `node --watch`.
* Expo dev server reloads mobile app updates automatically.
* Static web output is watched and rebuilt into `TreeGuardiansExpo/dist` by `expo-web-build`.

### Expo Go From Physical Phone

* Default mode is `EXPO_HOST_MODE=tunnel`, which is the most reliable for a physical phone.
* Open the Expo QR/link from Expo logs and launch in Expo Go.
* If you prefer LAN mode, set `EXPO_HOST_MODE=lan` in `.env.docker`.

### Android Emulator Notes

* Emulator requires `/dev/kvm` access on host.
* Inside emulator:
  * `localhost:4000` maps to backend
  * `localhost:8081` maps to Expo dev server
* Expo Go is auto-installed in emulator when APK can be resolved for configured SDK.

### Logs

Runtime logs are written to `logs/`:

* `logs/mysql.log`
* `logs/server.log`
* `logs/expo.log`
* `logs/expo-web-build.log`
* `logs/android-emulator.log`

---
