# Components

`components/base` contains cross-platform UI primitives and feature panels shared by screens.

`components/map` contains map overlays, marker rendering, dashboard panels, and filter/search controls.

`components/auth` contains route helpers for authentication-aware navigation.

Use `AppText`, `AppButton`, `AppInput`, `AppContainer`, and `AppTouchableOpacity` before raw React Native primitives when building app UI.

## Key Components

| Component | Purpose |
| --- | --- |
| `MapComponent` | Platform switch for native and web map implementations. |
| `TreeDashboard` | Full tree detail, activity, photo, edit, QR, and admin actions panel. |
| `AddTreeDashboard` | Collects tree details before device or manual placement. |
| `TreeHealthSelect` | Shared health picker for add/edit and search filters. |
| `TreeSpeciesSelect` | Species picker backed by the generated dataset. |
| `StatusMessageBox` | Animated success/error message with optional countdown and copy action. |
| `CircularCountdown` | SVG countdown ring used by timed status flows. |

## Component Contracts

`MapComponent` accepts `plottedTrees`, `selectedLocation`, `isPlotting`, `onPress`, `onTreeClick`, `renderTreeIcon`, `onViewportCenterChange`, and `onPlotPointerMove`.

`TreeHealthSelect` accepts the full health range by default; pass `TREE_HEALTH_FORM_OPTIONS` for new tree submissions.

`StatusMessageBox` renders `StatusMessage | null`, auto-dismisses success messages after 4 seconds, and shows a copy action for errors by default.
