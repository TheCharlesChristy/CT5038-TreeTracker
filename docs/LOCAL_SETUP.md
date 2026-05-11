# Local Setup

The local stack runs the backend, database, Expo web build, Expo dev server, and Android emulator from one command.

## Start

```bash
./scripts/local_plesk_stack.sh
```

Use quiet mode when terminal output is too noisy:

```bash
./scripts/local_plesk_stack.sh --quiet
```

Stop with `Ctrl+C`; the launcher runs `docker compose down --remove-orphans`.

## Requirements

- Docker Engine with the Compose plugin.
- `/dev/kvm` available and readable/writable by the user running Docker.
- `server/.env` and `.env.docker`; the launcher copies examples when either is missing.

## Services

| Service | Purpose | Main port |
| --- | --- | --- |
| `mysql` | MySQL 8.0 data store. | `3306` |
| `expo-web-build` | Watches Expo source and writes `TreeGuardiansExpo/dist`. | none |
| `server` | Runs `app.js`, `/api/*`, health routes, uploads, and static web output. | `4000` |
| `expo` | Runs `npx expo start --go`. | `8081` |
| `android-emulator` | Runs Expo Go in Android and exposes noVNC. | `6080` |

## URLs

- Web app and backend: `http://localhost:${SERVER_PORT}`; default `4000`.
- Expo dev server: `http://localhost:${EXPO_DEV_SERVER_PORT}`; default `8081`.
- Android emulator: `http://localhost:6080/vnc.html`.

## Local Config

`.env.docker` is read by `scripts/local_plesk_stack.sh` and `docker/compose.local.yml`.

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `MYSQL_ROOT_PASSWORD` | string | `root` | Sets the local MySQL root password and the backend DB password. |
| `MYSQL_DATABASE` | string | `treetracker_dev` | Creates and selects the local database. |
| `SERVER_PORT` | integer | `4000` | Publishes the backend container. |
| `EXPO_DEV_SERVER_PORT` | integer | `8081` | Publishes the Expo dev server. |
| `EXPO_HOST_MODE` | `tunnel` or `lan` | `tunnel` | Selects Expo Go connection mode. |
| `WEB_BUILD_DEBOUNCE_SECONDS` | integer | `2` | Poll interval for static web export rebuilds. |

Backend runtime config lives in `server/.env`; see [server/README.md](../server/README.md).

## Files

- Launcher: `scripts/local_plesk_stack.sh`.
- Compose file: `docker/compose.local.yml`.
- Compatibility compose file: `docker-compose.plesk-local.yml`.
- Backend image: `docker/images/server.Dockerfile`.
- Expo image: `docker/images/expo.Dockerfile`.
- Emulator image: `docker/images/android-emulator.Dockerfile`.
- Web export watcher: `docker/scripts/watch-expo-web.sh`.
- Emulator entrypoint: `docker/scripts/android-emulator-entrypoint.sh`.

## Logs

The launcher mirrors service logs into `logs/`.

```bash
docker compose --env-file .env.docker -f docker/compose.local.yml ps
tail -n 200 logs/*.log
tail -f logs/android-emulator.log
```

## Database Reset

```bash
./scripts/local_plesk_stack.sh --reset
```

`--reset` drops the configured local MySQL database after validating the database name.

## Troubleshooting

`/dev/kvm` missing or blocked: enable virtualization, install KVM, and add the current user to the host KVM access path.

Expo link missing: inspect `logs/expo.log` and look for the first `exp://` URL.

Web UI stale: inspect `logs/expo-web-build.log` and confirm `TreeGuardiansExpo/dist` is changing.

Database connection errors: check `docker compose ps`, `MYSQL_*` in `.env.docker`, and `DB_*` in `server/.env`.
