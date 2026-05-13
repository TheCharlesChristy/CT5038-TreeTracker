# Styles

`styles/index.ts` re-exports the app theme, layout helpers, and design tokens.

Import shared styles from the package index:

```ts
import { Theme, getResponsiveLayoutMetrics } from '@/styles';
```

## Tokens

| Token | Values |
| --- | --- |
| `Colours` | `primary`, `secondary`, `accent`, `backgroundSoft`, `textPrimary`, `textMuted`, `textLight`, `white`, `black`, `gray`, `success`, `error`, `warning` |
| `Spacing` | `extraSmall: 4`, `small: 8`, `medium: 16`, `large: 24`, `extraLarge: 32` |
| `Radius` | `extraSmall: 3`, `small: 6`, `medium: 10`, `large: 16`, `card: 20` |
| `Border` | `extraSmall: 3`, `small: 6`, `medium: 10`, `large: 16` |
| `Typography` | `title`, `subtitle`, `tagline`, `body`, `caption` |

## Theme

`Theme` groups tokens and shared styles for `container`, `background`, `button`, and `dimOverlay`.

## Layout

`getResponsiveLayoutMetrics(width, height)` returns breakpoint flags and reusable dimensions for compact, phone, tablet, and desktop layouts.

Breakpoints:

- `compact`: `< 380`
- `phone`: `< 680`
- `tablet`: `680..899`
- `desktop`: `>= 900`
