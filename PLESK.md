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
nodenv local 20.0.0
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

## Local Stack (Redesigned)

The local Docker stack has been reorganized to keep Docker assets centralized and make running the full environment one command.

### Docker Layout

```
docker/
├── compose.local.yml
├── images/
│   ├── server.Dockerfile
│   ├── expo.Dockerfile
│   └── android-emulator.Dockerfile
└── scripts/
  ├── watch-expo-web.sh
  └── android-emulator-entrypoint.sh
```

### One Command To Run

```bash
./scripts/local_plesk_stack.sh
```

Quiet mode (mostly Expo output in terminal):

```bash
./scripts/local_plesk_stack.sh -q
```

Stop with `Ctrl+C`.

### What You See In Terminal

The launcher always prints stable local URLs at startup:

* `http://localhost:4000/` (backend + static web)
* `http://localhost:8081/` (Expo dev server)
* `http://localhost:6080/vnc.html` (Android emulator noVNC)

`expo` is always attached in quiet mode so Expo QR/tunnel lines remain visible in terminal.

### Logging

Full logs are always streamed into per-service files in `logs/`:

* `logs/mysql.log`
* `logs/server.log`
* `logs/expo-web-build.log`
* `logs/expo.log`
* `logs/android-emulator.log`

### Expo/Emulator Notes

* Expo tunnel mode is preconfigured with `@expo/ngrok` installed in the Expo image.
* Android emulator image resolves Expo Go APK for SDK `54`.
* If a container fails to boot, stack exits (no restart loop).