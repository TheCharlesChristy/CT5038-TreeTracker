# Expo App

TreeGuardiansExpo is the Expo Router frontend for mapping, adding, filtering, and managing Charlton Kings tree records.

## Run

```bash
npm install
npm start
```

Useful scripts:

| Script | Effect |
| --- | --- |
| `npm run web` | Starts Expo for web development. |
| `npm run android` | Opens the app in an Android target. |
| `npm run ios` | Opens the app in an iOS target. |
| `npm run export:web` | Writes the static web build to `dist/`. |
| `npm run lint` | Runs Expo lint checks. |
| `npm run species:update` | Regenerates the tree species dataset. |

## App Structure

| Path | Responsibility |
| --- | --- |
| `app/` | Expo Router screens and route groups. |
| `app/(protected)/` | Screens that require a stored access token. |
| `components/base/` | Shared UI primitives and feature panels. |
| `components/map/` | Map overlays, markers, and filter panels. |
| `config/api.ts` | API origin and endpoint helpers. |
| `lib/` | Backend API clients and data transforms. |
| `objects/` | Shared app data types. |
| `styles/` | Theme, layout helpers, and design tokens. |
| `utilities/` | Auth storage, alerts, phone formatting, and geo helpers. |

## Environment

Expo reads public variables at bundle time.

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | URL or path | current web origin, or native fallback `http://localhost:4000/api` | Sets the full API base; `/api` is appended when missing. |
| `EXPO_PUBLIC_API_ORIGIN` | URL | current web origin, or native fallback `http://localhost:4000` | Sets the backend origin when `EXPO_PUBLIC_API_BASE_URL` is unset. |
| `EXPO_PUBLIC_WEB_ORIGIN` | URL | resolved API origin | Sets the public web origin used in tree QR links. |

On native Expo dev builds, localhost API values are rewritten to the Expo host machine so a device or emulator can reach the backend.

## Further Docs

- Components: [components/README.md](components/README.md)
- Style tokens: [styles/README.md](styles/README.md)
- Tree species dataset: [docs/tree-species-dataset.md](docs/tree-species-dataset.md)
